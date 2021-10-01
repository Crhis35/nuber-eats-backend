import { Field, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { Category } from '../entities/category.entity';

@ObjectType()
export class AllCategoriesoOutput extends CoreOutput {
  @Field(() => [Category], { nullable: true })
  categories?: Category[];
}
