// A route to handle new user registration
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword
    });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// A function to assign a role to a user
async function assignRoleToUser(userId, roleId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Assuming a M:N relationship between users and roles
    await user.addRole(roleId);
    return 'Role assigned successfully';
  } catch (error) {
    throw new Error('Failed to assign role');
  }
}