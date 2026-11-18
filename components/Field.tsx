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
  /** select: the empty first option; input/textarea: the placeholder text */
  placeholder?: string;
  maxLength?: number;
  /** textarea only: the N in the "count/N" counter */
  maxCount?: number;
  /** textarea only: change to remount (re-sync the counter) after a successful save */
  resetKey?: number;
  /** Keep the label for screen readers only (the placeholder shows the hint visually). */
  hideLabel?: boolean;
  /** input only: shown inside the right edge of the input (e.g. a show-password toggle). Mark decorative content aria-hidden yourself. */
  adornment?: React.ReactNode;
  /** Shown on the same row as the error message, pushed to the right (e.g. a "forgot password" link). */
  footer?: React.ReactNode;
  /** Extra class on the wrapper, for page-scoped styling. */
  className?: string;
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
  maxLength,
  hideLabel = false,
  adornment,
  footer,
  className,
}: Props) {
  const id = `${idPrefix}${name}`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : undefined;
  const input = () => (
    <input
      id={id}
      defaultValue={defaultValue}
      name={name}
      type={type}
      autoComplete={autoComplete}
      required={required}
      max={max}
      inputMode={inputMode}
      placeholder={placeholder}
      maxLength={maxLength}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={CONTROL}
    />
  );
  return (
    <div className={`flex flex-col gap-1${className ? ` ${className}` : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm font-medium'}>
        {label}
      </label>
      {as === 'textarea' ? (
        <CountedTextarea
          // key remounts (re-syncs the counter) after a successful save.
          key={resetKey}
          id={id}
          name={name}
          defaultValue={defaultValue}
          maxCount={maxCount ?? 500}
          invalid={Boolean(error)}
          describedBy={describedBy}
          placeholder={placeholder}
        />
      ) : as === 'select' ? (
        <select
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
      ) : adornment ? (
        <div className="field-control">
          {input()}
          <span className="field-adornment">{adornment}</span>
        </div>
      ) : (
        input()
      )}
      {footer ? (
        <div className="field-foot">
          {error ? (
            <p id={errorId} className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {footer}
        </div>
      ) : error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
