import { CountedTextarea } from './CountedTextarea';

type Option = { value: string; label: string };

type Props = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  defaultValue?: string;
  /** Prefix for the element id so the same field can appear twice on a page. */
  idPrefix?: string;
  required?: boolean;
  max?: string;
  inputMode?: 'numeric' | 'text';
  as?: 'input' | 'textarea' | 'select';
  /** select only */
  options?: readonly Option[];
  placeholder?: string;
  /** textarea only: the N in the "count/N" counter */
  maxCount?: number;
  /** textarea only: change to remount (re-sync the counter) after a successful save */
  resetKey?: number;
};

const CONTROL = 'rounded border border-neutral-400 bg-transparent px-3 py-2';

export function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  error,
  defaultValue,
  idPrefix = '',
  required = true,
  max,
  inputMode,
  as = 'input',
  options = [],
  placeholder,
  maxCount,
  resetKey = 0,
}: Props) {
  const id = `${idPrefix}${name}`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {as === 'textarea' ? (
        <CountedTextarea
          // key remounts so a returned value survives the React 19 form reset.
          key={`${resetKey}:${defaultValue ?? ''}`}
          id={id}
          name={name}
          defaultValue={defaultValue}
          maxCount={maxCount ?? 500}
          invalid={Boolean(error)}
          describedBy={describedBy}
        />
      ) : as === 'select' ? (
        <select
          key={defaultValue ?? ''}
          id={id}
          name={name}
          defaultValue={defaultValue ?? ''}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={CONTROL}
        >
          {placeholder !== undefined ? <option value=''>{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          // key remounts the input so a returned value survives the React 19 form reset.
          key={defaultValue ?? ''}
          id={id}
          defaultValue={defaultValue}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          max={max}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={CONTROL}
        />
      )}
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
