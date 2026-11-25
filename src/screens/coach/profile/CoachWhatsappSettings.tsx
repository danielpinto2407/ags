import { Users } from 'lucide-react';
import AppButton from '@/components/AppButton';
import FeedbackMessage from '@/components/FeedbackMessage';
import ProfileImagePicker from '@/components/ProfileImagePicker';
import ColombianPhoneField from '@/components/ColombianPhoneField';
import { profileRepository } from '@/data/profileRepository';

interface CoachWhatsappSettingsProps {
  tenantId: string;
  number: string;
  savedNumber: string;
  legacyNumber: string | null;
  loadingNumber: boolean;
  savingNumber: boolean;
  numberFeedback: { type: 'error' | 'success'; message: string } | null;
  avatarPath: string | null;
  avatarLoading: boolean;
  avatarRemoving: boolean;
  avatarError: string | null;
  onNumberChange: (value: string) => void;
  onSaveNumber: (remove?: boolean) => void;
  onUploadAvatar: (file: File) => Promise<string>;
  onRemoveAvatar: () => void;
}

export default function CoachWhatsappSettings(props: CoachWhatsappSettingsProps) {
  const invalidNumber = props.number !== '' && !/^3[0-9]{9}$/.test(props.number);
  return (
    <>
      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <ColombianPhoneField
          disabled={props.loadingNumber || props.savingNumber}
          id="coach-whatsapp"
          onChange={props.onNumberChange}
          value={props.number}
        />
        {props.legacyNumber && (
          <FeedbackMessage kind="warning" message={`Tu número guardado (+${props.legacyNumber}) se conserva. Para cambiarlo, ingresa un celular colombiano.`} />
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {props.legacyNumber && (
            <AppButton disabled={props.loadingNumber || props.savingNumber} onClick={() => props.onSaveNumber(true)} type="button" variant="secondary">Quitar número</AppButton>
          )}
          <AppButton
            disabled={props.loadingNumber || props.savingNumber || props.number === props.savedNumber || invalidNumber}
            onClick={() => props.onSaveNumber(false)}
            type="button"
          >
            {props.savingNumber ? 'Guardando…' : 'Guardar número'}
          </AppButton>
        </div>
        {props.numberFeedback && <FeedbackMessage kind={props.numberFeedback.type} message={props.numberFeedback.message} />}
      </div>

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <div>
          <p className="text-xs font-semibold text-zinc-300">Avatar de WhatsApp del gimnasio</p>
          <p className="mt-1 text-[10px] text-zinc-500">PNG con fondo transparente, hasta 5 MB.</p>
        </div>
        {!props.avatarLoading && (
          <ProfileImagePicker
            alt="Avatar de contacto del gimnasio"
            fallback={<Users aria-hidden="true" size={27} />}
            imageUrl={profileRepository.getPublicMediaUrl(props.avatarPath)}
            label={props.avatarPath ? 'Cambiar avatar' : 'Subir avatar'}
            onUpload={props.onUploadAvatar}
            pngOnly
            shape="logo"
          />
        )}
        {props.avatarPath && (
          <AppButton disabled={props.avatarRemoving} onClick={props.onRemoveAvatar} type="button" variant="secondary">
            {props.avatarRemoving ? 'Quitando…' : 'Quitar avatar'}
          </AppButton>
        )}
        {props.avatarError && <FeedbackMessage kind="error" message={props.avatarError} />}
      </div>
    </>
  );
}
