/**
 * UserSession class to manage user state in WebSocket connections
 */
class UserSession {
  constructor(socketId, userId = null) {
    this.socketId = socketId;
    this.userId = userId;
    this.username = null;
    this.role = null;
    this.wallet = 0;
    this.isAuthenticated = false;
    this.selectedTickets = [];
    this.lastActivity = new Date();
    this.connectionTime = new Date();
  }

  /**
   * Authenticate user with provided data
   * @param {Object} userData - User data from database
   */
  authenticate(userData) {
    this.userId = userData.user_id;
    this.username = userData.username;
    this.role = userData.role;
    this.wallet = userData.wallet;
    this.isAuthenticated = true;
    this.lastActivity = new Date();
  }

  /**
   * Update user wallet amount
   * @param {number} newAmount - New wallet amount
   */
  updateWallet(newAmount) {
    this.wallet = newAmount;
    this.lastActivity = new Date();
  }

  /**
   * Add ticket to selected tickets list
   * @param {number} ticketId - Ticket ID to add
   */
  addSelectedTicket(ticketId) {
    if (!this.selectedTickets.includes(ticketId)) {
      this.selectedTickets.push(ticketId);
    }
    this.lastActivity = new Date();
  }

  /**
   * Remove ticket from selected tickets list
   * @param {number} ticketId - Ticket ID to remove
   */
  removeSelectedTicket(ticketId) {
    this.selectedTickets = this.selectedTickets.filter(id => id !== ticketId);
    this.lastActivity = new Date();
  }

  /**
   * Clear all selected tickets
   */
  clearSelectedTickets() {
    this.selectedTickets = [];
    this.lastActivity = new Date();
  }

  /**
   * Check if user is admin or owner
   * @returns {boolean} - True if user has admin privileges
   */
  isAdmin() {
    return this.role === 'owner' || this.role === 'admin';
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = new Date();
  }

  /**
   * Get complete session information
   * @returns {Object} - Session information object
   */
  getSessionInfo() {
    return {
      socketId: this.socketId,
      userId: this.userId,
      username: this.username,
      role: this.role,
      wallet: this.wallet,
      isAuthenticated: this.isAuthenticated,
      selectedTickets: this.selectedTickets,
      lastActivity: this.lastActivity,
      connectionTime: this.connectionTime,
      connectionDuration: new Date() - this.connectionTime
    };
  }

  /**
   * Create user response object for client
   * @returns {Object} - User response object
   */
  createUserResponse() {
    return {
      user_id: this.userId,
      username: this.username,
      role: this.role,
      wallet: parseFloat(this.wallet),
      initial_wallet: parseFloat(this.wallet),
      current_wallet: parseFloat(this.wallet),
      email: null, // Will be set from database
      phone: null, // Will be set from database
      password_hash: 'session_hash',
      password_algo: 'bcrypt',
      email_verified_at: null,
      phone_verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sessionInfo: this.getSessionInfo()
    };
  }
}

module.exports = UserSession;