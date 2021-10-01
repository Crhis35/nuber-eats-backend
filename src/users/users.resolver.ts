import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { Role } from 'src/auth/role.decorator';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { LogInInput, LoginOutput } from './dtos/login.dto';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { User } from './entities/user.entity';
import {
  VerifyEmailInput,
  VerifyEmailOutput,
} from './entities/verify-email.dto';
import { UserService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => CreateAccountOutput)
  async createAccount(
    @Args('input') createAccountUnput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    try {
      const { ok, error } = await this.userService.createAccount(
        createAccountUnput,
      );
      return {
        ok,
        error,
      };
    } catch (error) {
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  @Mutation(() => LoginOutput)
  async login(@Args('input') loginInput: LogInInput): Promise<LoginOutput> {
    try {
      const res = await this.userService.login(loginInput);
      return res;
    } catch (error) {
      return {
        ok: false,
        error: error.message,
      };
    }
  }

  @Query(() => User)
  @Role(['Any'])
  me(@AuthUser() authUser: User): User {
    return authUser;
  }

  @Query(() => UserProfileOutput)
  @Role(['Any'])
  async userProfile(
    @Args() userProfile: UserProfileInput,
  ): Promise<UserProfileOutput> {
    try {
      const { user } = await this.userService.findById(userProfile.userId);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        ok: Boolean(user),
        user,
      };
    } catch (error) {
      return {
        error: error.message,
        ok: false,
      };
    }
  }
  @Role(['Any'])
  @Mutation(() => EditProfileOutput)
  async editProfile(
    @AuthUser() authUser: User,
    @Args('input') editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    try {
      return await this.userService.editProfile(authUser.id, editProfileInput);
    } catch (error) {
      return {
        error: error.message,
        ok: false,
      };
    }
  }
  @Mutation(() => VerifyEmailOutput)
  async verifyEmail(
    @Args('input') { code }: VerifyEmailInput,
  ): Promise<VerifyEmailOutput> {
    try {
      return await this.userService.verifyEmail(code);
    } catch (error) {
      return {
        ok: false,
        error: error.message,
      };
    }
  }
}
