import { Dumbbell } from 'lucide-react';
import ProfileImagePicker from '@/components/ProfileImagePicker';

interface CoachProfileIdentityProps {
  name: string;
  gymName: string;
  logoUrl: string | null;
  onUploadLogo: (file: File) => Promise<string>;
}

export default function CoachProfileIdentity({ name, gymName, logoUrl, onUploadLogo }: CoachProfileIdentityProps) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <ProfileImagePicker
        alt={gymName}
        fallback={<Dumbbell aria-hidden="true" size={27} />}
        imageUrl={logoUrl}
        label="Subir logo"
        onUpload={onUploadLogo}
        shape="logo"
      />
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-bold text-white">{name}</h2>
        <p className="truncate text-xs text-zinc-500">{gymName}</p>
      </div>
    </div>
  );
}
