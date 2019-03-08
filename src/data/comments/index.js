import DataLoader from 'dataloader';
import _ from 'lodash';

export const fetchCommentsByUserId = async (db, id) => {
  console.log('fetching comments by user id', id)
  const comments = await db('comments').where({
    commentable_type: 'User',
    commentable_id: id
  });
  return comments.map(comment => ({
    id: comment.id,
    // author: xxx,
    authorId: comment.creator_id,
    body: comment.content
  }))
}


export const fetchAuthorByCommentId = async (db, id) => {
  console.log('fetching author by comment id', id)
  const users = await db('comments').join('users', 'users.id', '=', 'comments.creator_id').select('users.*').where({
    'comments.id': id
  });
  if(users.length < 1) {
    return null;
  }
  const user = users[0];
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
}

export const batchGetComments = async (db, keys) => {
  console.log('batch getting comments', keys)
  const comments = await db('comments').whereIn('id', keys);
  
  return _.sortBy(comments, (comment) => keys.indexOf(user.id)).map(comment => {
    return {
      id: comment.id,
      body: comment.content
    }
  });
}


export const getCommentLoader = db => new DataLoader(keys => batchGetComments(db, keys));
// const commentLoader = new DataLoader(keys => batchGetComments(keys));