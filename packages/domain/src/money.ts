import { Decimal } from 'decimal.js';

// Configure Decimal for financial precision (24 digits, bankers or half-up rounding)
Decimal.set({ precision: 24, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export type CurrencyCode = 'QAR' | 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | string;

export class Money {
  private readonly _amount: Decimal;
  private readonly _currency: CurrencyCode;

  constructor(amount: Decimal.Value | Money, currency: CurrencyCode = 'QAR') {
    if (amount instanceof Money) {
      this._amount = amount._amount;
      this._currency = amount._currency;
    } else {
      this._amount = new Decimal(amount);
      this._currency = currency.toUpperCase();
    }
  }

  static fromString(amountStr: string, currency: CurrencyCode): Money {
    return new Money(amountStr, currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0, currency);
  }

  get amount(): Decimal {
    return this._amount;
  }

  get currency(): CurrencyCode {
    return this._currency;
  }

  /**
   * Returns exact string representation suitable for API payloads and DB numeric columns.
   */
  toString(): string {
    return this._amount.toFixed(6);
  }

  /**
   * Returns standard 2-decimal display format.
   */
  toDisplayString(): string {
    return this._amount.toFixed(2);
  }

  toJSON(): { amount: string; currency: CurrencyCode } {
    return {
      amount: this.toString(),
      currency: this._currency,
    };
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Currency mismatch: cannot operate between ${this._currency} and ${other._currency}`
      );
    }
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.plus(other._amount), this._currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount.minus(other._amount), this._currency);
  }

  times(factor: Decimal.Value): Money {
    return new Money(this._amount.times(factor), this._currency);
  }

  multiply(factor: Decimal.Value): Money {
    return this.times(factor);
  }

  dividedBy(divisor: Decimal.Value): Money {
    const d = new Decimal(divisor);
    if (d.isZero()) {
      throw new Error('Division by zero in money calculation');
    }
    return new Money(this._amount.dividedBy(d), this._currency);
  }

  equals(other: Money): boolean {
    return this._currency === other._currency && this._amount.equals(other._amount);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.greaterThan(other._amount);
  }

  greaterThanOrEqualTo(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.greaterThanOrEqualTo(other._amount);
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.lessThan(other._amount);
  }

  lessThanOrEqualTo(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount.lessThanOrEqualTo(other._amount);
  }

  isZero(): boolean {
    return this._amount.isZero();
  }

  isPositive(): boolean {
    return this._amount.isPositive() && !this._amount.isZero();
  }

  isNegative(): boolean {
    return this._amount.isNegative();
  }
}
