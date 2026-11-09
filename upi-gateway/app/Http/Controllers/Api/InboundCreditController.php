<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Receives "money received" alerts (SMS / app notification text forwarded from
 * the merchant's phone) and records them as proof of a real credit. Orders are
 * only auto-paid when a customer's UTR matches one of these records.
 */
class InboundCreditController extends Controller
{
    public function __construct(private OrderService $orders) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'message' => ['nullable', 'string', 'max:1000'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'utr' => ['nullable', 'string', 'regex:/^\d{12}$/'],
        ]);

        $text = (string) ($data['message'] ?? '');
        $amount = $data['amount'] ?? null;
        $utr = $data['utr'] ?? null;

        if ($text !== '') {
            // Only credit alerts count; ignore debits and OTP/promotional text.
            if (! preg_match('/\b(received|credited)\b/i', $text)) {
                return response()->json(['success' => true, 'recorded' => false, 'reason' => 'not a credit alert']);
            }
            if ($amount === null && preg_match('/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/iu', $text, $m)) {
                $amount = (float) str_replace(',', '', $m[1]);
            }
            if ($utr === null && preg_match('/(?<!\d)(\d{12})(?!\d)/', $text, $m)) {
                $utr = $m[1];
            }
        }

        if ($amount === null || $utr === null) {
            return response()->json(['success' => false, 'message' => 'Could not find an amount and a 12-digit UTR.'], 422);
        }

        $merchant = $request->user();
        $recorded = DB::table('inbound_credits')->insertOrIgnore([
            'user_id' => $merchant->id,
            'amount' => round((float) $amount, 2),
            'utr' => $utr,
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // A customer may have submitted the UTR before the alert arrived.
        $settled = $recorded ? $this->orders->settleReviewOrderFromCredit($merchant->id, $utr) : null;

        return response()->json([
            'success' => true,
            'recorded' => (bool) $recorded,
            'order_id' => $settled?->order_no,
        ]);
    }
}
