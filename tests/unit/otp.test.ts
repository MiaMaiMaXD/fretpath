import { describe, expect, it } from 'vitest';
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, formatClock, isOtpCode, otpDigits, secondsLeft } from '@/lib/otp';

describe('otp', () => {
  it('accepts exactly six digits', () => {
    expect(isOtpCode('681542')).toBe(true);
    expect(isOtpCode('68154')).toBe(false);
    expect(isOtpCode('6815420')).toBe(false);
    expect(isOtpCode('68154a')).toBe(false);
    expect(isOtpCode(' 681542')).toBe(false);
  });

  it('counts down the 3-minute code window and the 30-second resend cooldown', () => {
    const sent = 1_000_000;
    expect(secondsLeft(sent, OTP_TTL_SECONDS, sent)).toBe(180);
    expect(secondsLeft(sent, OTP_TTL_SECONDS, sent + 30_000)).toBe(150);
    expect(secondsLeft(sent, OTP_TTL_SECONDS, sent + 179_001)).toBe(1);
    expect(secondsLeft(sent, OTP_TTL_SECONDS, sent + 180_000)).toBe(0);
    expect(secondsLeft(sent, OTP_TTL_SECONDS, sent + 999_000)).toBe(0);
    expect(secondsLeft(sent, OTP_RESEND_SECONDS, sent + 29_500)).toBe(1);
    expect(secondsLeft(sent, OTP_RESEND_SECONDS, sent + 30_000)).toBe(0);
  });

  it('formats the clock like the mockup', () => {
    expect(formatClock(180)).toBe('3:00');
    expect(formatClock(150)).toBe('2:30');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(-5)).toBe('0:00');
  });

  it('keeps only digits from pasted text, at most six', () => {
    expect(otpDigits('681 542')).toEqual(['6', '8', '1', '5', '4', '2']);
    expect(otpDigits('code: 6815429')).toEqual(['6', '8', '1', '5', '4', '2']);
    expect(otpDigits('abc')).toEqual([]);
  });
});
