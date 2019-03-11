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


export const fetchCurrentUser = async (ctx) => {
  const user = ctx.user;
  console.log('fetching current user', user)
  if(typeof user === 'undefined' || !user){
    return null;
  }
  return user;
}


export const fetchUserById = async (db, id) => {
  console.log('fetching user by id', id)
  const user = await getUserLoader(db).load(id);
  if(!user){
    return null;
  }
  return user;
}

export const getUserLoader = db => new DataLoader(keys => batchGetUsers(db, keys));
