import { RoleButton } from '@/components/admin/RoleButton';
import { listLearners } from '@/lib/data/admin';

export const metadata = { title: 'ผู้เรียน' };

export default async function AdminLearnersPage() {
  const learners = await listLearners();
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">ผู้เรียน</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-400">
              <th scope="col" className="p-2">ชื่อ</th>
              <th scope="col" className="p-2">บทที่จบ</th>
              <th scope="col" className="p-2">คะแนนเฉลี่ย</th>
              <th scope="col" className="p-2">นาทีฝึกสัปดาห์นี้</th>
              <th scope="col" className="p-2">ฝึกล่าสุด</th>
              <th scope="col" className="p-2">สิทธิ์</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((l) => {
              const name = l.displayName || 'ไม่ระบุชื่อ';
              return (
                <tr key={l.id} className="border-b border-neutral-300 dark:border-neutral-700">
                  <th scope="row" className="p-2 font-medium">{name}</th>
                  <td className="p-2">{l.total === null ? '—' : `${l.completed} / ${l.total}`}</td>
                  <td className="p-2">{l.avgBestScore === null ? '—' : `${l.avgBestScore}%`}</td>
                  <td className="p-2">{l.weekMinutes}</td>
                  <td className="p-2">{l.lastPracticedOn ?? '—'}</td>
                  <td className="p-2">
                    <span className="mr-2">{l.role === 'admin' ? 'ผู้ดูแล' : 'ผู้เรียน'}</span>
                    <RoleButton userId={l.id} name={name} role={l.role} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
