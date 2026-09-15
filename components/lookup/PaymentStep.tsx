'use client';

import { ArrowLeft, CheckCircle2, Loader2, Smartphone, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatUgx,
  type FeeForPayment,
  type OneOffChargeForPayment,
  type StudentLookupData,
} from '@/components/lookup/types';

interface PaymentStepProps {
  data: StudentLookupData;
  selectedFee: FeeForPayment | null;
  selectedOneOff: OneOffChargeForPayment | null;
  paymentAmount: string;
  paymentPhone: string;
  processingPayment: boolean;
  paymentReference: string | null;
  amountExceeded: boolean;
  enteredAmount: number;
  onSelectFee: (fee: FeeForPayment) => void;
  onSelectOneOff: (charge: OneOffChargeForPayment) => void;
  onAmountChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPay: () => void;
  onBack: () => void;
}

export function PaymentStep({
  data,
  selectedFee,
  selectedOneOff,
  paymentAmount,
  paymentPhone,
  processingPayment,
  paymentReference,
  amountExceeded,
  enteredAmount,
  onSelectFee,
  onSelectOneOff,
  onAmountChange,
  onPhoneChange,
  onPay,
  onBack,
}: PaymentStepProps) {
  const schoolFeeTotal =
    data.payment_summary.school_fee_total ??
    data.available_fees
      ?.filter((f) => f.fee_type === 'school_fees')
      .reduce((sum, f) => sum + (f.amount || 0), 0) ??
    data.student.school_fees_amount ??
    0;
  const otherFeeTotal =
    data.payment_summary.other_fee_total ??
    data.available_fees
      ?.filter((f) => f.fee_type === 'other_fees')
      .reduce((sum, f) => sum + (f.amount || 0), 0) ??
    0;
  const payableFees = data.available_fees.filter((f) => !!f.id && !f.is_paid && f.outstanding > 0);
  const payableCharges = (data.available_one_off_charges || []).filter(
    (c) => c.status === 'unpaid' && c.outstanding > 0,
  );
  const selectedItem = selectedOneOff || selectedFee;
  const payLabel = selectedItem
    ? formatUgx(Number(paymentAmount) || selectedItem.outstanding)
    : 'Pay';

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#08163d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#08163d]">
            {data.student.full_name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {data.student.class}
            {data.student.gender ? ` · ${data.student.gender}` : ''}
            {' · '}
            {data.school.name}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-[#08163d] p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/60">Outstanding</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          {formatUgx(data.payment_summary.total_outstanding)}
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-white/50">School fees</dt>
            <dd className="font-medium">{formatUgx(schoolFeeTotal)}</dd>
          </div>
          <div>
            <dt className="text-white/50">Other fees</dt>
            <dd className="font-medium">{formatUgx(otherFeeTotal)}</dd>
          </div>
          {data.payment_summary.one_off_outstanding !== undefined && (
            <div>
              <dt className="text-white/50">Additional</dt>
              <dd className="font-medium">{formatUgx(data.payment_summary.one_off_outstanding)}</dd>
            </div>
          )}
        </dl>
      </div>

      {payableFees.length === 0 && payableCharges.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          No payable balances for this student right now.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#08163d]">Select what to pay</p>
          <div className="grid gap-2">
            {payableFees.map((fee) => {
              const selected = selectedFee?.id === fee.id;
              return (
                <button
                  key={fee.id}
                  type="button"
                  onClick={() => onSelectFee(fee)}
                  className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors ${
                    selected
                      ? 'border-[#E8A317] bg-[#FFF4C2]/40'
                      : 'border-slate-100 bg-white hover:border-[#E8A317]/50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-[#08163d]">{fee.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Outstanding {formatUgx(fee.outstanding)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fee.is_locked && (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500">Locked</Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                        {fee.fee_type === 'school_fees' ? 'School fees' : 'Other fees'}
                      </Badge>
                    </div>
                  </div>
                  {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E8A317]" />}
                </button>
              );
            })}
            {payableCharges.map((charge) => {
              const selected = selectedOneOff?.id === charge.id;
              return (
                <button
                  key={charge.id}
                  type="button"
                  onClick={() => onSelectOneOff(charge)}
                  className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors ${
                    selected
                      ? 'border-[#E8A317] bg-[#FFF4C2]/40'
                      : 'border-slate-100 bg-white hover:border-[#E8A317]/50'
                  }`}
                >
                  <div>
                    <p className="font-medium text-[#08163d]">{charge.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Full amount required · {formatUgx(charge.outstanding)}
                    </p>
                    <Badge variant="outline" className="mt-2 text-[11px] uppercase tracking-wide">
                      Additional charge
                    </Badge>
                  </div>
                  {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E8A317]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-sm font-medium text-[#08163d]">Pay with mobile money</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment_amount">Amount (UGX)</Label>
              <Input
                id="payment_amount"
                type="number"
                min="1"
                max={selectedItem.outstanding}
                value={paymentAmount}
                onChange={(e) => onAmountChange(e.target.value)}
                readOnly={!!selectedOneOff || !!selectedFee?.is_locked}
                disabled={!!selectedOneOff || !!selectedFee?.is_locked}
                placeholder={selectedItem.outstanding.toString()}
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-500">
                {selectedOneOff
                  ? `Additional charge: full amount of ${formatUgx(selectedOneOff.outstanding)} is required`
                  : selectedFee?.is_locked
                    ? `Locked fee: full outstanding of ${formatUgx(selectedFee.outstanding)} is required`
                    : `Enter the amount to send. Max outstanding: ${formatUgx(selectedFee?.outstanding ?? 0)}`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_phone">Phone</Label>
              <Input
                id="payment_phone"
                placeholder="0700123456"
                value={paymentPhone}
                onChange={(e) => onPhoneChange(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
          </div>
          <Button
            onClick={onPay}
            disabled={
              processingPayment ||
              amountExceeded ||
              !paymentAmount ||
              !Number.isFinite(enteredAmount) ||
              enteredAmount <= 0
            }
            className="h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90 sm:w-auto sm:px-8"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Pay {payLabel}
              </>
            )}
          </Button>
          {processingPayment && (
            <div className="flex items-start gap-3 rounded-xl border border-[#E8A317]/30 bg-[#FFF4C2]/50 p-3 text-sm">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#E8A317]" />
              <div>
                <p className="font-medium text-[#08163d]">Approve on your phone</p>
                <p className="mt-0.5 text-slate-600">
                  Confirm the mobile money prompt to complete this payment.
                </p>
                {paymentReference && (
                  <p className="mt-1 font-mono text-xs text-slate-500">Ref: {paymentReference}</p>
                )}
              </div>
            </div>
          )}
          {paymentReference && !processingPayment && (
            <div className="rounded-xl border border-slate-100 bg-white p-3 text-sm">
              <p className="font-medium text-[#08163d]">Payment initiated</p>
              <p className="mt-0.5 font-mono text-slate-600">Ref: {paymentReference}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
