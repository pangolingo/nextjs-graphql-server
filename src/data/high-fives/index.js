export const fetchHighFivesByUserId = async (db, id) => {
  console.log('fetching high fives by user id', id)
  const highFives = await db('high_fives').where({
    user_id: id
  });
  return highFives.map(comment => ({
    id: comment.id,
    // author: xxx,
  }))
}