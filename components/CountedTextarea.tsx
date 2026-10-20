'use client';

import { useState } from 'react';

type Props = {
  id: string;
  name: string;
  defaultValue?: string;
  maxCount: number;
  invalid?: boolean;
  describedBy?: string;
};

export function CountedTextarea({ id, name, defaultValue = '', maxCount, invalid, describedBy }: Props) {
  const [count, setCount] = useState(() => [...defaultValue].length);
  return (
    <>
      <textarea
        id={id}
        name={name}
        defaultValue={defaultValue}
        rows={3}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => setCount([...e.target.value].length)}
        className="rounded border border-neutral-400 bg-transparent px-3 py-2"
      />
      <p className={`text-sm ${count > maxCount ? 'text-red-600' : 'text-neutral-600 dark:text-neutral-400'}`}>
        {count}/{maxCount}
      </p>
    </>
  );
}
