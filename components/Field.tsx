type Props = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  defaultValue?: string;
};

export function Field({ name, label, type = 'text', autoComplete, error, defaultValue }: Props) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        // key remounts the input so a returned value survives the React 19 form reset.
        key={defaultValue ?? ''}
        id={name}
        defaultValue={defaultValue}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded border border-neutral-400 bg-transparent px-3 py-2"
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
