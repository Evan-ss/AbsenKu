import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    nama: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      nama: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    nama: string;
  }
}
