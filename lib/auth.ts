import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createHash } from 'crypto';
import sql from './db';

function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const hashedPassword = md5(credentials.password);

        const users = await sql`
          SELECT u.usuario_id, u.usuario_display, u.usuario_email, u.usuario_funcao, u.usuario_hash,
                 e.empresa_id, e.empresa_nome, e.empresa_cnpj
          FROM usuarios u
          LEFT JOIN empresas_associacao ea ON ea.ea_usuario = u.usuario_id
          LEFT JOIN empresas e ON e.empresa_id = ea.ea_empresa
          WHERE u.usuario_email = ${credentials.email}
            AND u.usuario_senha = ${hashedPassword}
            AND u.usuario_ativo = 1
          LIMIT 1
        `;

        const user = users[0];
        if (!user) return null;

        return {
          id: String(user.usuario_id),
          name: user.usuario_display,
          email: user.usuario_email,
          funcao: user.usuario_funcao,
          hash: user.usuario_hash,
          empresaId: user.empresa_id ? String(user.empresa_id) : null,
          empresaNome: user.empresa_nome || null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.funcao = (user as any).funcao;
        token.hash = (user as any).hash;
        token.empresaId = (user as any).empresaId;
        token.empresaNome = (user as any).empresaNome;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).funcao = token.funcao;
        (session.user as any).hash = token.hash;
        (session.user as any).empresaId = token.empresaId;
        (session.user as any).empresaNome = token.empresaNome;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
