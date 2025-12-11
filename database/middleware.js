// Middleware to check for 'moderator' role
const isModerator = (req, res, next) => {
  if (req.user && req.user.roles.includes('moderator')) {
    next(); // User has the 'moderator' role, proceed to next middleware or route handler
  } else {
    res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
  }
};

// Apply the middleware to a restricted route
app.put('/posts/:id', isModerator, (req, res) => {
  // Logic to edit a post
});