import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'L\'image de profil doit être une chaîne de caractères' })
  profileImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @Matches(/^(\+216|0)?[2459]\d{7}$/, {
    message:
      'Le numéro de téléphone doit être au format tunisien (ex: +216 20123456, 020123456, ou 20123456)',
  })
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Le contact d\'urgence doit être une chaîne de caractères' })
  emergencyContact?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Le numéro d\'urgence doit être une chaîne de caractères' })
  @Matches(/^(\+216|0)?[2459]\d{7}$/, {
    message:
      'Le numéro de téléphone d\'urgence doit être au format tunisien (ex: +216 20123456, 020123456, ou 20123456)',
  })
  emergencyPhone?: string;
}
