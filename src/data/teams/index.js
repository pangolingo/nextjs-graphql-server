import DataLoader from 'dataloader';
import _ from 'lodash';

export const fetchAllTeams = async (db) => {
  console.log('fetching all teams')
  const teams = await db('groups')
    // .join('user_groups', 'user_groups.group_id', '=', 'groups.id')
    // .select(['groups.*', 'user_groups.user_id'])
    // .whereNull('user_groups.deleted_at')
    .where('groups.active', true);
  if(teams.length < 1) {
    return [];
  }
  return teams.map(team => {
    return {
      id: team.id,
      name: team.nickname,
    }
  })
}

export const fetchTeam = async (db, id) => {
  console.log('fetching team', id);
  const team = await getTeamLoader(db).load(id);
  if(!team){
    return null;
  }
  return team;
}

export const fetchUsersByTeamId = async (db, id) => {
  console.log('fetching users in team', id);
  const users = await db('users')
    .select("users.*")
    .leftJoin('user_groups', 'users.id', '=', 'user_groups.user_id')
    .leftJoin('groups', 'groups.id', '=', 'user_groups.group_id')
    .whereNull('user_groups.deleted_at')
    .where('groups.id', id)
    .where('groups.active', true)
    .where('users.active', true)
    .whereNull('users.deleted_at');
  if(users.length < 1) {
    return [];
  }
  return users.map(user => {
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      city: user.city,
      state: user.state,
      jobTitle: user.job_title
    }
  })
};


export const batchGetTeams = async (db, keys) => {
  console.log('batch getting teams', keys)
  const teams = await db('groups').whereIn('id', keys);
  
  return _.sortBy(teams, (team) => keys.indexOf(team.id)).map(team => {
    return {
      id: team.id,
      name: team.nickname
    }
  });
}


export const getTeamLoader = db => new DataLoader(keys => batchGetTeams(db, keys));
// export const teamLoader = new DataLoader(keys => batchGetTeams(keys));