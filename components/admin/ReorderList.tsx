'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { reorderLessons } from '@/app/(admin)/admin/lessons/actions';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { keepValuesSubmit } from '@/components/useKeepValuesSubmit';
import type { ActionState } from '@/lib/action-state';

export type ReorderRow = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  sortOrder: number;
  passScore: number;
  questionCount: number;
};

const EMPTY: ActionState = { ok: false };

export function ReorderList({ courseId, lessons }: { courseId: string; lessons: ReorderRow[] }) {
  const [state, action, pending] = useActionState(
    (prev: ActionState, fd: FormData) => reorderLessons(courseId, prev, fd),
    EMPTY,
  );
  return (
    <form onSubmit={keepValuesSubmit(action)} className="space-y-3" noValidate>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-300 dark:border-neutral-700">
              <th scope="col" className="p-2">ลำดับ</th>
              <th scope="col" className="p-2">ชื่อ</th>
              <th scope="col" className="p-2">สถานะ</th>
              <th scope="col" className="p-2">เกณฑ์ผ่าน</th>
              <th scope="col" className="p-2">จำนวนคำถาม</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr
                // Remount after a successful save so the inputs show the saved (renumbered) order.
                key={`${l.id}-${l.sortOrder}`}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                <td className="p-2">
                  <input
                    name={`order-${l.id}`}
                    aria-label={`ลำดับของ ${l.title}`}
                    defaultValue={state.values?.[`order-${l.id}`] ?? String(l.sortOrder)}
                    inputMode="numeric"
                    className="w-20 rounded border border-neutral-400 bg-transparent px-2 py-1"
                  />
                </td>
                <td className="p-2">
                  <Link href={`/admin/lessons/${l.id}`} className="underline underline-offset-4">
                    {l.title}
                  </Link>
                </td>
                <td className="p-2">{l.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</td>
                <td className="p-2">{l.passScore}%</td>
                <td className="p-2">{l.questionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>บันทึกลำดับ</SubmitButton>
    </form>
  );
}
