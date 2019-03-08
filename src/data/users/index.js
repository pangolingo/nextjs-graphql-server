import DataLoader from 'dataloader';
import _ from 'lodash';

export const batchGetUsers = async (db, keys) => {
  console.log('batch getting users', keys)
  const users = await db('users').whereIn('id', keys);
  
  return _.sortBy(users, (user) => keys.indexOf(user.id)).map(user => {
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      city: user.city,
      state: user.state,
      jobTitle: user.job_title
    }
  });
}


export const fetchCurrentUser = async (user) => {
  console.log('fetching current user', user)
  // const user = await conn('users').first();
  // const user = await conn('users').where({id: 'dce36881-946e-45b2-b003-b949107f7ff8'}).first()
  // const user = await userLoader.load('dce36881-946e-45b2-b003-b949107f7ff8');
  if(typeof user === 'undefined' || !user){
    return null;
  }
  return user;
  // return {
  //   id: user.id,
  //   firstName: user.first_name,
  //   lastName: user.last_name,
  //   fullName: `${user.first_name} ${user.last_name}`,
  //   role: user.role,
  //   city: user.city,
  //   state: user.state,
  //   highFives: [],
  //   comments: []
  // }
}


export const fetchUserById = async (db, id) => {
  console.log('fetching user by id', id)
  const user = await getUserLoader(db).load(id);
  // const user = await conn('users').where({
  //   id
  // }).first();
  if(!user){
    return null;
  }
  return user;
  // return {
  //   id: user.id,
  //   firstName: user.first_name,
  //   lastName: user.last_name,
  //   fullName: `${user.first_name} ${user.last_name}`,
  //   role: user.role,
  //   city: user.city,
  //   state: user.state,
  //   highFives: [],
  //   comments: []
  // }
}

export const getUserLoader = db => new DataLoader(keys => batchGetUsers(db, keys));
// new DataLoader(keys => batchGetUsers(keys));
