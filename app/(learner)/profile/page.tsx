import { AvatarUpload } from '@/components/AvatarUpload';
import { getMyProfile } from '@/lib/data/profile';
import { ProfileForm } from './form';

export default async function ProfilePage() {
  const p = await getMyProfile();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">โปรไฟล์</h1>
      <AvatarUpload userId={p.id} avatarUrl={p.avatarUrl} />
      <p>
        <span className="text-sm font-medium">อีเมล</span>
        <br />
        <span>{p.email}</span>
      </p>
      <ProfileForm displayName={p.displayName} weeklyGoalMinutes={p.weeklyGoalMinutes} />
    </div>
  );
}
