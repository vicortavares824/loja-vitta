# Implementation Plan: customer-profile

## Overview

Endereços salvos e dados pessoais (telefone e CPF) no perfil do cliente, com escolha de endereço salvo no checkout. Cartões salvos ficam fora deste escopo.

## Tasks

- [x] 1. Criar a migração das tabelas do cliente
  - Criar `supabase/migrations/20261124000000_customer_profile.sql` com `customer_addresses` e `customer_details`, RLS por `auth.uid()` e um endereço padrão por usuário
  - Criar o rollback em `supabase/rollback/20261124000000_customer_profile.down.sql`

- [x] 2. Criar tipos, serviço e liberar o ViaCEP
  - Criar `src/types/customer.ts` e `src/services/customerService.ts` (CRUD de endereços, dados pessoais, busca de CEP no ViaCEP, validação de CPF e formatação do endereço)
  - Adicionar `https://viacep.com.br` ao `connect-src` da CSP em `vercel.json`
- [x] 3. Adicionar dados pessoais e endereços à `ProfilePage`
  - Seção de telefone e CPF e seção de endereços (listar, adicionar, editar, excluir e definir padrão), com busca por CEP

- [x] 4. Usar o endereço salvo no `CartDrawer`
  - Permitir escolher um endereço salvo, preenchendo o campo de endereço do checkout

- [x] 5. Checkpoint - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3", "4"] },
    { "id": 3, "tasks": ["5"] }
  ]
}
```