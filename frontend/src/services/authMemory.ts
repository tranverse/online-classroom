class AuthMemory {
  private token: string | null = null;
  private user: any = null;

  setToken(t: string | null) {
    this.token = t;
  }
  getToken() {
    return this.token;
  }

  setUser(u: any) {
    this.user = u;
  }
  getUser() {
    return this.user;
  }

  clear() {
    this.token = null;
    this.user = null;
  }
}

const authMemory = new AuthMemory();
export default authMemory;
