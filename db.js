const ObjectId = require('mongodb').ObjectId;

const addUser = (db, username) => {
  const users = db.collection('users');
  return users.findOne({ username })
    .then(doc => {
      if (doc === null) {
        return users.insertOne({
          username
        })
          .then(response => response.ops[0])
      }

      return { error: 'Username already exists' };
    });
};

const addExercise = (db, body) => {
  const { id, description, duration, date } = body;
  const users = db.collection('users');
  const exercises = db.collection('exercises');

  return users.findOne({ _id: ObjectId(id) })
    .then(doc => {
      if (doc === null) return { error: 'User not found' }

      return exercises.insertOne({
        username: doc.username,
        userId: doc._id,
        description,
        duration: Number(duration),
        date: new Date(date).toISOString(),
      })
        .then(response => response.ops[0]);
    });
};

const fetchLog = (db, body) => {
  const users = db.collection('users');
  return users.findOne({ _id: ObjectId(body.id) })
    .then(doc => {
      if (doc === null) throw Error('User does not exist');

      const exercises = db.collection('exercises');

      const query = {
        userId: ObjectId(body.id)
      };

      if (body.startTime || body.endTime) {
        query.date = {};
      }

      if (body.startTime) {
        query.date.$gte = new Date(body.startTime).toISOString();
      }

      if (body.endTime) {
        query.date.$lte = new Date(body.endTime).toISOString();
      }

      const cursor = exercises.find(query).limit(Number(body.limit));

      return cursor.toArray().then(docs => {
        const result = {
          user: doc,
          log: docs.map(doc => ({
            description: doc.description,
            duration: doc.duration,
            date: doc.date.split('T')[0]
          }))
        };

        return result;
      });
    });
};


module.exports = {
  addUser,
  addExercise,
  fetchLog
};
