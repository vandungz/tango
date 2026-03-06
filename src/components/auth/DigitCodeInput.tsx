'use client';

import { useMemo, useRef } from 'react';
import styles from '@/app/auth/auth.module.css';

interface DigitCodeInputProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
}

export default function DigitCodeInput({
    id,
    value,
    onChange,
    length = 6,
    disabled = false,
    autoFocus = false,
}: DigitCodeInputProps) {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const digits = useMemo(() => {
        const items = value.slice(0, length).split('');
        while (items.length < length) items.push('');
        return items;
    }, [value, length]);

    const focusIndex = (index: number) => {
        const target = inputRefs.current[index];
        if (target) target.focus();
    };

    const updateAt = (index: number, nextDigit: string) => {
        const next = digits.slice();
        next[index] = nextDigit;
        onChange(next.join(''));
    };

    const handleDigitChange = (index: number, rawValue: string) => {
        if (disabled) return;

        const numeric = rawValue.replace(/\D/g, '');
        if (!numeric) {
            updateAt(index, '');
            return;
        }

        const digit = numeric[numeric.length - 1];
        updateAt(index, digit);

        if (index < length - 1) {
            focusIndex(index + 1);
        }
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            focusIndex(index - 1);
            return;
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            focusIndex(index - 1);
            return;
        }

        if (event.key === 'ArrowRight' && index < length - 1) {
            event.preventDefault();
            focusIndex(index + 1);
        }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        event.preventDefault();
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        if (!pasted) return;

        onChange(pasted);

        const targetIndex = Math.min(pasted.length, length) - 1;
        if (targetIndex >= 0) {
            focusIndex(targetIndex);
        }
    };

    return (
        <div className={styles.digitInputRow} role="group" aria-label="Verification code">
            {digits.map((digit, index) => (
                <input
                    key={`${id}-${index}`}
                    ref={(element) => {
                        inputRefs.current[index] = element;
                    }}
                    id={index === 0 ? id : undefined}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                    className={styles.digitInputCell}
                    disabled={disabled}
                    autoFocus={autoFocus && index === 0}
                    aria-label={`Digit ${index + 1}`}
                />
            ))}
        </div>
    );
}
