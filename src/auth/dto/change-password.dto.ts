import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Le mot de passe actuel doit être une chaîne' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis' })
  currentPassword: string;

  @IsString({ message: 'Le nouveau mot de passe doit être une chaîne' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128, { message: 'Le mot de passe ne doit pas dépasser 128 caractères' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial (@$!%*?&)',
    },
  )
  newPassword: string;

  @IsString({ message: 'La confirmation du mot de passe doit être une chaîne' })
  @IsNotEmpty({ message: 'La confirmation du mot de passe est requise' })
  confirmPassword: string;
}