module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade
        'fix',      // Correção de bug
        'docs',     // Documentação
        'style',    // Formatação e estilização
        'refactor', // Refatoração de código
        'perf',     // Performance e otimização
        'test',     // Testes unitários / E2E
        'build',    // Sistema de build / dependências
        'ci',       // CI/CD pipelines
        'chore',    // Tarefas gerais e configs
        'revert'    // Reversão de commits
      ]
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never']
  }
};
