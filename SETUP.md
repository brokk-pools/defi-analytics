# Setup Guide - Orca Whirlpools MVP

## 🚀 Quick Start

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Setup do Ambiente

```bash
# Clone o projeto
git clone <your-repo>
cd orca-mvp

# Configurar variáveis de ambiente backend
cd backend
cp .env.example .env
# Edite .env com sua chave Helius API (obtenha em https://dev.helius.xyz)

# Configurar variáveis de ambiente frontend
cd ../frontend
echo "VITE_API_URL=http://localhost:3001" > .env
```

### 2. Banco de Dados

```bash
# Iniciar PostgreSQL
cd ../infra
docker compose up -d

# Verificar se está rodando
docker compose ps
```

### 3. Backend

```bash
cd ../backend

# Instalar dependências
npm install

# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
```

O backend estará disponível em `http://localhost:3001`

### 4. Frontend

```bash
cd ../frontend

# Instalar dependências (se necessário)
npm install

# Iniciar desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## 🔧 Configuração da Helius API

1. Acesse [https://dev.helius.xyz](https://dev.helius.xyz)
2. Crie uma conta gratuita (100k requests/mês)
3. Obtenha sua API key
4. Atualize o arquivo `backend/.env`:

```env
HELIUS_API_KEY=sua_chave_aqui
```

5. Reinicie o backend

## 🧪 Testando a Aplicação

### Endpoints Backend

```bash
# Health check
curl http://localhost:3001/health

# Teste wallet com dados demo
curl http://localhost:3001/wallet/11111111111111111111111111111112

# Retorna:
# {"wallet":"11111111111111111111111111111112","positions":[{"nftMint":"DemoPosition1234567890abcdef","poolAddress":"DemoPool1234567890abcdef","tokenA":"SOL","tokenB":"USDC","tickLower":-29760,"tickUpper":29760,"liquidity":"1000000000","currentPrice":98.45,"inRange":true,"estimatedFeesA":"0.125","estimatedFeesB":"12.34"},{"nftMint":"DemoPosition0987654321fedcba","poolAddress":"DemoPool0987654321fedcba","tokenA":"USDC","tokenB":"RAY","tickLower":-1000,"tickUpper":1000,"liquidity":"500000000","currentPrice":2.15,"inRange":false,"estimatedFeesA":"5.67","estimatedFeesB":"0.089"}]}
```

### Frontend

1. Abra `http://localhost:5173`
2. Digite qualquer chave pública válida (ex: `11111111111111111111111111111112`)
3. Clique em "Fetch Positions"
4. Visualize as **2 posições demo** com design profissional:
   - **SOL/USDC**: In Range, ₹98.45, com fees estimadas
   - **USDC/RAY**: Out of Range, ₹2.15, com fees estimadas

### ✅ Status Atual - MVP Demo Funcional

- **Backend**: ✅ Rodando com dados mockados realistas
- **Frontend**: ✅ Interface profissional completa
- **Database**: ✅ PostgreSQL configurado
- **API**: ✅ Endpoints funcionando
- **UX**: ✅ Loading states, validação, design responsivo

## 📋 Funcionalidades Implementadas

### Backend
- ✅ API REST com Express.js + TypeScript
- ✅ Integração com Orca SDK (simplificada para MVP)
- ✅ Tratamento robusto de erros
- ✅ Validação de entrada
- ✅ Conexão PostgreSQL
- ✅ Estrutura para webhooks Helius
- ✅ Sistema de logging

### Frontend
- ✅ Interface React moderna com Vite
- ✅ Design profissional com CSS customizado
- ✅ Loading states e skeleton loading
- ✅ Validação de entrada
- ✅ Tratamento de erros
- ✅ Responsivo para mobile

### Infraestrutura
- ✅ PostgreSQL via Docker
- ✅ Adminer para gerenciamento do DB
- ✅ Configuração de ambiente
- ✅ TypeScript compilado

## 🔧 Resolução de Problemas

### Backend não inicia
```bash
# Verificar variáveis de ambiente
cd backend && cat .env

# Verificar se banco está rodando
docker compose ps

# Verificar logs
docker compose logs db
```

### Frontend não conecta
```bash
# Verificar URL da API
cd frontend && cat .env

# Verificar se backend está rodando
curl http://localhost:3001/health
```

### Erro de posições
- Certifique-se de que a chave Helius API está configurada
- Use uma carteira que tenha posições reais no Orca Devnet
- Verifique logs do backend para detalhes

## 🚀 Próximos Passos

Para produção, considere:
1. Configurar chave Helius real
2. Implementar integração completa do Orca SDK
3. Configurar webhook Helius
4. Deploy em VPS (ver DEPLOYMENT.md)
5. Monitoramento e logs
6. Testes automatizados

## 📚 Documentação Adicional

- [README.md](./README.md) - Documentação completa
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guia de deploy
- [Orca SDK](https://dev.orca.so/) - Documentação oficial
- [Helius API](https://docs.helius.dev/) - Documentação Helius