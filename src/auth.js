import bcrypt from 'bcrypt';

const comparePassword = (hashedPassword, password) => {
  if(!hashedPassword){
    return false;
  }
  return bcrypt.compare(password, hashedPassword)
}

export const authenticateUser = async (db, email, password) => {
  const user = await db('users').where({email, active: true}).whereNull('deleted_at').first();
  console.log(`did we find a user (${email})?`, user);
  if(!user){
    console.log('no user')
    return null;
  }
  const passwordMatches = await comparePassword(user.encrypted_password, password)
  if(passwordMatches){
    console.log('password matches')
    return user;
  }
  console.log('password doesnt match')
  return null;
}