const UserService = require('../services/UserService');
const { validateLoginInput, validateRegistrationInput, createUserResponse, getExistingUserError } = require('../utils/helpers');

/**
 * Authentication controller
 */
class AuthController {
  /**
   * Handle user login
   * @param {Object} socket - Socket connection
   * @param {Object} data - Login data
   * @param {Object} session - User session
   * @param {Map} userSessions - User sessions map
   * @param {Function} io - Socket.io broadcast function
   */
  static async handleLogin(socket, data, session, userSessions, io) {
    console.log(`🔐 LOGIN ATTEMPT: ${socket.id} - ${data.username}`);

    try {
      // Validate input
      const validation = validateLoginInput(data);
      if (!validation.isValid) {
        socket.emit('auth:error', { error: validation.error });
        return;
      }

      const { username, password } = data;

      // Find user by username
      const user = await UserService.findByUsername(username);
      if (!user) {
        socket.emit('auth:error', { error: 'ไม่พบผู้ใช้นี้' });
        return;
      }

      // Validate password
      if (password !== user.password) {
        socket.emit('auth:error', { error: 'รหัสผ่านไม่ถูกต้อง' });
        return;
      }

      // Authenticate user in session
      session.authenticate(user);
      userSessions.set(user.user_id, session);

      // Create response user object
      const responseUser = createUserResponse(user, 'login');
      responseUser.sessionInfo = session.getSessionInfo();

      console.log('📤 Sending auth:success response:');
      console.log('Response data:', JSON.stringify({
        user: responseUser,
        isAdmin: user.role === 'owner' || user.role === 'admin',
        message: 'เข้าสู่ระบบสำเร็จ'
      }, null, 2));

      // Send success response
      socket.emit('auth:success', {
        user: responseUser,
        isAdmin: user.role === 'owner' || user.role === 'admin',
        message: 'เข้าสู่ระบบสำเร็จ'
      });

      // Broadcast user joined (to admins)
      socket.broadcast.emit('user:joined', {
        userId: user.user_id,
        username: user.username,
        role: user.role
      });

      console.log(`✅ LOGIN SUCCESS: ${username} (${socket.id})`);

    } catch (error) {
      console.error('Login error:', error);
      socket.emit('auth:error', { error: 'เกิดข้อผิดพลาดในระบบ' });
    }
  }

  /**
   * Handle user registration
   * @param {Object} socket - Socket connection
   * @param {Object} data - Registration data
   * @param {Object} session - User session
   * @param {Map} userSessions - User sessions map
   */
  static async handleRegister(socket, data, session, userSessions) {
    console.log(`📝 REGISTER ATTEMPT: ${socket.id} - ${data.username}`);

    try {
      // Validate input
      const validation = validateRegistrationInput(data);
      if (!validation.isValid) {
        socket.emit('auth:error', { error: validation.error });
        return;
      }

      const { username, email, phone, password, role = 'member' } = data;
      const walletAmount = validation.walletAmount;

      // Check for existing users
      const existingUser = await UserService.findExisting(username, email, phone);
      if (existingUser) {
        const errorMessage = getExistingUserError(existingUser, username, email, phone);
        socket.emit('auth:error', { error: errorMessage });
        return;
      }

      // Create new user
      const userData = {
        username,
        email,
        phone,
        role,
        password,
        wallet: walletAmount
      };

      const user = await UserService.create(userData);

      // Authenticate user in session
      session.authenticate(user);
      userSessions.set(user.user_id, session);

      // Create response user object
      const responseUser = createUserResponse(user, 'register');
      responseUser.sessionInfo = session.getSessionInfo();

      socket.emit('auth:success', {
        user: responseUser,
        isAdmin: false,
        message: 'สมัครสมาชิกสำเร็จ'
      });

      console.log(`✅ REGISTER SUCCESS: ${username} (${socket.id})`);

    } catch (error) {
      console.error('Register error:', error);
      socket.emit('auth:error', { error: 'เกิดข้อผิดพลาดในระบบ' });
    }
  }

  /**
   * Check if user is authenticated
   * @param {Object} session - User session
   * @param {Object} socket - Socket connection
   * @returns {boolean} True if authenticated
   */
  static requireAuth(session, socket) {
    if (!session.isAuthenticated) {
      socket.emit('auth:required', { error: 'กรุณาเข้าสู่ระบบก่อน' });
      return false;
    }
    return true;
  }

  /**
   * Check if user has admin privileges
   * @param {Object} session - User session
   * @param {Object} socket - Socket connection
   * @returns {boolean} True if admin
   */
  static requireAdmin(session, socket) {
    if (!session.isAuthenticated || !session.isAdmin()) {
      socket.emit('auth:forbidden', { error: 'ไม่มีสิทธิ์เข้าถึง' });
      return false;
    }
    return true;
  }
}

module.exports = AuthController;