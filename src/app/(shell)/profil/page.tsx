import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) notFound();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, name: true, role: true, avatar: true, bio: true },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Moj profil</h1>
      <ProfileForm
        username={user.username}
        name={user.name}
        role={user.role}
        initialAvatar={user.avatar}
        initialBio={user.bio}
      />
    </div>
  );
}
