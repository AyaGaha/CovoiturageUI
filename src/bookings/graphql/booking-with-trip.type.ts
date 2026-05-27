import { ObjectType, Field } from '@nestjs/graphql';
import { TripType } from '../../trips/graphql/trip.type';
import { BookingType } from './booking.type';
import { PassengerType } from './passenger.type';

@ObjectType()
export class BookingWithTripType extends BookingType {
  @Field(() => TripType, { nullable: true })
  trip?: TripType;

  @Field(() => PassengerType, { nullable: true })
  passenger?: PassengerType;
}