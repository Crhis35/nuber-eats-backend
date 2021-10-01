import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});
const GRAPQHL_ENDPOINT = '/graphql';

const testUser = {
  email: 'test@test.com',
  password: 'test',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });
  afterAll(async () => {
    await getConnection().dropDatabase();
    await app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
            createAccount(input: {
              email: "${testUser.email}",
              password: "${testUser.password}",
              role: Owner
          }){
            ok
            error
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });
    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
            createAccount(input: {
              email: "${testUser.email}",
              password: "${testUser.password}",
              role: Owner
          }){
            ok
            error
          }
        }`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toEqual(expect.any(String));
          expect(res.body.data.createAccount.error).toBe(
            'There is a user with that email already',
          );
        });
    });
  });
  describe('login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
          login(input: {
            email: "${testUser.email}",
            password: "${testUser.password}",
        }){
          ok
          token
          error
        }
      }`,
        })
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });
    it('should fail with incorrect credentials', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
        login(input: {
          email: "${testUser.email}",
          password: "12122",
      }){
        ok
        error
      }
    }`,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.login;
          expect(ok).toBe(false);
          expect(error).toEqual(expect.any(String));
          expect(error).toBe('Incorrect password');
        });
    });
  });
  describe('userProfile', () => {
    let userId: number;

    beforeAll(async () => {
      const user = await userRepository.findOne({
        email: testUser.email,
      });

      userId = user.id;
    });
    it('should see a user profile', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .set(`bearer`, jwtToken)
        .send({
          query: `{
              userProfile(userId: ${userId}) {
                error
                ok
                user {
                  id
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error, user } = res.body.data.userProfile;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(user.id).toEqual(expect.any(Number));
        });
    });
    it('should see a user profile', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .set(`bearer`, jwtToken)
        .send({
          query: `{
              userProfile(userId: 2) {
                error
                ok
                user {
                  id
                }
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error, user } = res.body.data.userProfile;
          expect(ok).toBe(false);
          expect(error).toBe('User not found');
          expect(user).toBe(null);
        });
    });
  });
  describe('me', () => {
    it('should find my profile', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .set(`bearer`, jwtToken)
        .send({
          query: `{
              me{
                email
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { email } = res.body.data.me;
          expect(email).toBe(testUser.email);
        });
    });
    it('should not allow logged user ', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `{
              me{
                email
              }
            }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { errors } = res.body;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });
  });
  describe('editProfile', () => {
    const NEW_EMAIL = 'test@test.com';

    it('should change email', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .set(`bearer`, jwtToken)
        .send({
          query: `mutation{
            editProfile(input: {email: "${NEW_EMAIL}"}){
              ok
              error
            }
          }
        `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.editProfile;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should have a new email', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .set(`bearer`, jwtToken)
        .send({
          query: `{
                me{
                  email
                }
              }
          `,
        })
        .expect(200)
        .expect((res) => {
          const { email } = res.body.data.me;
          expect(email).toBe(NEW_EMAIL);
        });
    });
  });
  describe('verifyEmail', () => {
    let verificationCode: string;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      verificationCode = verification.code;
    });
    it('should verify email', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
            verifyEmail(input: {code: "${verificationCode}"}){
              ok
              error
            }
          }
        `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });
    it('should fail verify email', () => {
      return request(app.getHttpServer())
        .post(GRAPQHL_ENDPOINT)
        .send({
          query: `mutation{
            verifyEmail(input: {code: "asasa"}){
              ok
              error
            }
          }
        `,
        })
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBe(false);
          expect(error).toEqual('Verification not found');
        });
    });
  });
});

// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from '../src/app.module';
// import { getConnection, Repository } from 'typeorm';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { User } from 'src/users/entities/user.entity';
// import { Verification } from 'src/users/entities/verification.entity';

// jest.mock('got', () => {
//   return {
//     post: jest.fn(),
//   };
// });

// const GRAPHQL_ENDPOINT = '/graphql';

// const testUser = {
//   email: 'nico@las.com',
//   password: '12345',
// };

// describe('UserModule (e2e)', () => {
//   let app: INestApplication;
//   let usersRepository: Repository<User>;
//   let verificationsRepository: Repository<Verification>;
//   let jwtToken: string;

//   const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
//   const publicTest = (query: string) => baseTest().send({ query });
//   const privateTest = (query: string) =>
//     baseTest()
//       .set('X-JWT', jwtToken)
//       .send({ query });

//   beforeAll(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();
//     app = module.createNestApplication();
//     usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
//     verificationsRepository = module.get<Repository<Verification>>(
//       getRepositoryToken(Verification),
//     );
//     await app.init();
//   });

//   afterAll(async () => {
//     await getConnection().dropDatabase();
//     app.close();
//   });

//   describe('createAccount', () => {
//     it('should create account', () => {
//       return publicTest(`
//         mutation {
//           createAccount(input: {
//             email:"${testUser.email}",
//             password:"${testUser.password}",
//             role:Owner
//           }) {
//             ok
//             error
//           }
//         }
//         `)
//         .expect(200)
//         .expect(res => {
//           expect(res.body.data.createAccount.ok).toBe(true);
//           expect(res.body.data.createAccount.error).toBe(null);
//         });
//     });

//     it('should fail if account already exists', () => {
//       return publicTest(`
//           mutation {
//             createAccount(input: {
//               email:"${testUser.email}",
//               password:"${testUser.password}",
//               role:Owner
//             }) {
//               ok
//               error
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 createAccount: { ok, error },
//               },
//             },
//           } = res;
//           expect(ok).toBe(false);
//           expect(error).toBe('There is a user with that email already');
//         });
//     });
//   });

//   describe('login', () => {
//     it('should login with correct credentials', () => {
//       return publicTest(`
//           mutation {
//             login(input:{
//               email:"${testUser.email}",
//               password:"${testUser.password}",
//             }) {
//               ok
//               error
//               token
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: { login },
//             },
//           } = res;
//           expect(login.ok).toBe(true);
//           expect(login.error).toBe(null);
//           expect(login.token).toEqual(expect.any(String));
//           jwtToken = login.token;
//         });
//     });
//     it('should not be able to login with wrong credentials', () => {
//       return publicTest(`
//           mutation {
//             login(input:{
//               email:"${testUser.email}",
//               password:"xxx",
//             }) {
//               ok
//               error
//               token
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: { login },
//             },
//           } = res;
//           expect(login.ok).toBe(false);
//           expect(login.error).toBe('Wrong password');
//           expect(login.token).toBe(null);
//         });
//     });
//   });

//   describe('userProfile', () => {
//     let userId: number;
//     beforeAll(async () => {
//       const [user] = await usersRepository.find();
//       userId = user.id;
//     });
//     it("should see a user's profile", () => {
//       return privateTest(`
//           {
//             userProfile(userId:${userId}){
//               ok
//               error
//               user {
//                 id
//               }
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 userProfile: {
//                   ok,
//                   error,
//                   user: { id },
//                 },
//               },
//             },
//           } = res;
//           expect(ok).toBe(true);
//           expect(error).toBe(null);
//           expect(id).toBe(userId);
//         });
//     });
//     it('should not find a profile', () => {
//       return privateTest(`
//           {
//             userProfile(userId:666){
//               ok
//               error
//               user {
//                 id
//               }
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 userProfile: { ok, error, user },
//               },
//             },
//           } = res;
//           expect(ok).toBe(false);
//           expect(error).toBe('User Not Found');
//           expect(user).toBe(null);
//         });
//     });
//   });

//   describe('me', () => {
//     it('should find my profile', () => {
//       return privateTest(`
//           {
//             me {
//               email
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 me: { email },
//               },
//             },
//           } = res;
//           expect(email).toBe(testUser.email);
//         });
//     });
//     it('should not allow logged out user', () => {
//       return publicTest(`
//           {
//             me {
//               email
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: { errors },
//           } = res;
//           const [error] = errors;
//           expect(error.message).toBe('Forbidden resource');
//         });
//     });
//   });

//   describe('editProfile', () => {
//     const NEW_EMAIL = 'nico@new.com';
//     it('should change email', () => {
//       return privateTest(`
//             mutation {
//               editProfile(input:{
//                 email: "${NEW_EMAIL}"
//               }) {
//                 ok
//                 error
//               }
//             }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 editProfile: { ok, error },
//               },
//             },
//           } = res;
//           expect(ok).toBe(true);
//           expect(error).toBe(null);
//         });
//     });
//     it('should have new email', () => {
//       return privateTest(`
//           {
//             me {
//               email
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 me: { email },
//               },
//             },
//           } = res;
//           expect(email).toBe(NEW_EMAIL);
//         });
//     });
//   });

//   describe('verifyEmail', () => {
//     let verificationCode: string;
//     beforeAll(async () => {
//       const [verification] = await verificationsRepository.find();
//       verificationCode = verification.code;
//     });
//     it('should verify email', () => {
//       return publicTest(`
//           mutation {
//             verifyEmail(input:{
//               code:"${verificationCode}"
//             }){
//               ok
//               error
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 verifyEmail: { ok, error },
//               },
//             },
//           } = res;
//           expect(ok).toBe(true);
//           expect(error).toBe(null);
//         });
//     });
//     it('should fail on verification code not found', () => {
//       return publicTest(`
//           mutation {
//             verifyEmail(input:{
//               code:"xxxxx"
//             }){
//               ok
//               error
//             }
//           }
//         `)
//         .expect(200)
//         .expect(res => {
//           const {
//             body: {
//               data: {
//                 verifyEmail: { ok, error },
//               },
//             },
//           } = res;
//           expect(ok).toBe(false);
//           expect(error).toBe('Verification not found.');
//         });
//     });
//   });
// });
