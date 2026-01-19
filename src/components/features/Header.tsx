import Link from 'next/link';
import { auth } from '@/auth';
import { UserMenu } from './UserMenu';
import { AuthButton } from './AuthButton';

export async function Header() {
  const session = await auth();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/groups" className="text-xl font-bold text-blue-600">
          Fracture
        </Link>
        <div>
          {session?.user ? (
            <UserMenu user={session.user} />
          ) : (
            <AuthButton isSignedIn={false} />
          )}
        </div>
      </div>
    </header>
  );
}
