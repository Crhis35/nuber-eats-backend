import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@InputType('CategoryInputType', { isAbstract: true })
@ObjectType()
@Entity()
export class Category extends CoreEntity {
  @Column({ unique: true })
  @Field(() => String)
  @IsString()
  @Length(5)
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @Column({ nullable: true })
  coverImg: string;

  @Field(() => String)
  @IsString()
  @Column({ unique: true })
  slug: string;

  @Field(() => [Restaurant])
  @OneToMany(() => Restaurant, (restaurant) => restaurant.category, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  restaurants: Restaurant[];
}
