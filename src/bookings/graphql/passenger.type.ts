import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class PassengerType {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field({ nullable: true })
  phone?: string;

  @Field(() => Float, { nullable: true })
  rating?: number;
}