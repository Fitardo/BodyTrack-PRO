/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage in Node environment before importing services
const memoryStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => (memoryStore.has(key) ? memoryStore.get(key)! : null),
  setItem: (key: string, val: string) => {
    memoryStore.set(key, String(val));
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
  clear: () => {
    memoryStore.clear();
  },
  key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
  get length() {
    return memoryStore.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

import { StorageService } from '../services/storage';
import { analytics } from '../services/analytics';
import { AuthSession } from '../types/auth';

const API_BASE = 'http://localhost:3000';

test('PRUEBA 1: Aislamiento estricto de datos entre usuarios (Multi-tenant isolation)', () => {
  localStorageMock.clear();

  // Usuario A inicia sesión y registra un pesaje privado de 91.4 kg
  StorageService.setActiveTenant('usr_alpha_01');
  StorageService.saveWeighIn({
    id: 'w_alpha_1',
    measured_at: '2026-10-23T08:00:00Z',
    weight_kg: 91.4,
    fasting: true,
    notes: 'Registro privado de Alpha',
  });

  const alphaWeighIns = StorageService.getWeighIns();
  assert.equal(alphaWeighIns.some((w) => w.id === 'w_alpha_1' && w.weight_kg === 91.4), true);

  // Usuario B inicia sesión en el mismo navegador
  StorageService.setActiveTenant('usr_bravo_02');
  const bravoWeighIns = StorageService.getWeighIns();

  // Bravo NO debe ver el registro de Alpha
  assert.equal(
    bravoWeighIns.some((w) => w.id === 'w_alpha_1' || w.notes === 'Registro privado de Alpha'),
    false,
    'El usuario Bravo no puede leer pesajes del usuario Alpha'
  );

  // Bravo modifica sus propios datos sin afectar a Alpha
  StorageService.saveWeighIn({
    id: 'w_bravo_1',
    measured_at: '2026-10-23T08:30:00Z',
    weight_kg: 68.2,
    fasting: true,
  });

  // Volvemos a Alpha y comprobamos que sus datos siguen intactos y sin mezclar con Bravo
  StorageService.setActiveTenant('usr_alpha_01');
  const alphaReloaded = StorageService.getWeighIns();
  assert.equal(alphaReloaded.some((w) => w.id === 'w_alpha_1'), true);
  assert.equal(alphaReloaded.some((w) => w.id === 'w_bravo_1'), false);
});

test('PRUEBA 2: Un usuario sin invitación válida o con invitación revocada no puede registrarse', async () => {
  // 1. Intento de registro con código inexistente
  const invalidRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'intruder@example.com',
      password: 'PasswordSegura123!',
      name: 'Intruder',
      inviteCode: 'CODIGO-FALSO-999',
    }),
  });
  assert.equal(invalidRes.status, 403, 'Debe rechazar código de invitación inexistente con HTTP 403');

  // 2. Login como administrador para crear y revocar una invitación
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@bodytrack.pro',
      password: 'BodyTrackAdmin2026!',
    }),
  });
  assert.equal(adminLoginRes.status, 200);
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.session.token;

  // Crear código temporal y revocarlo inmediatamente
  const tempCode = `TEST-REVOKE-${Date.now()}`;
  const createInviteRes = await fetch(`${API_BASE}/api/admin/invites/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ customCode: tempCode, maxUses: 5, notes: 'Test revocación' }),
  });
  assert.equal(createInviteRes.status, 201);

  const revokeRes = await fetch(`${API_BASE}/api/admin/invites/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ code: tempCode }),
  });
  assert.equal(revokeRes.status, 200);

  // 3. Intentar registrarse con la invitación revocada
  const revokedRegRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'revoked.user@example.com',
      password: 'PasswordSegura123!',
      name: 'Usuario Revocado',
      inviteCode: tempCode,
    }),
  });
  assert.equal(revokedRegRes.status, 403, 'Una invitación revocada no debe permitir el registro');
});

test('PRUEBA 3: Los datos persisten tras cerrar sesión y volver a entrar', () => {
  localStorageMock.clear();

  const mockSession: AuthSession = {
    token: 'tok_persist_test',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    user: {
      id: 'usr_persist_99',
      email: 'persist@bodytrack.pro',
      name: 'Tester Persistencia',
      role: 'user',
      status: 'active',
      invite_code_used: 'BETA-PRO-2026',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      onboarding_completed: true,
    },
  };

  StorageService.setAuthSession(mockSession);
  StorageService.updateProfile({
    ...StorageService.getProfile(),
    name: 'Tester Persistencia Guardado',
    height_cm: 184,
  });

  // Cerrar sesión (pasa a null / guest)
  StorageService.setAuthSession(null);
  assert.equal(StorageService.getActiveTenant(), null);
  assert.notEqual(StorageService.getProfile().name, 'Tester Persistencia Guardado');

  // Volver a iniciar sesión con la misma cuenta
  StorageService.setAuthSession(mockSession);
  assert.equal(StorageService.getActiveTenant(), 'usr_persist_99');
  assert.equal(StorageService.getProfile().name, 'Tester Persistencia Guardado');
  assert.equal(StorageService.getProfile().height_cm, 184);
});

test('PRUEBA 4: La eliminación de cuenta o datos (Derecho al Olvido RGPD) purga todos los registros del usuario', () => {
  localStorageMock.clear();
  StorageService.setActiveTenant('usr_purge_target');
  StorageService.saveWeighIn({
    id: 'w_purge_1',
    measured_at: '2026-10-23T09:00:00Z',
    weight_kg: 79.5,
    fasting: true,
  });

  // Otro usuario guarda datos para verificar que el borrado no borra a otros usuarios
  StorageService.setActiveTenant('usr_safe_neighbor');
  StorageService.saveWeighIn({
    id: 'w_neighbor_1',
    measured_at: '2026-10-23T09:00:00Z',
    weight_kg: 74.0,
    fasting: true,
  });

  // Purgar datos de usr_purge_target
  StorageService.setActiveTenant('usr_purge_target');
  const removedCount = StorageService.purgeCurrentUserData();
  assert.ok(removedCount > 0, 'Debe eliminar las claves del tenant activo');

  // Comprobar que no queda ninguna clave de usr_purge_target en localStorage
  const remainingTargetKeys = Array.from(memoryStore.keys()).filter((k) =>
    k.startsWith('bt_usr_purge_target_')
  );
  assert.equal(remainingTargetKeys.length, 0, 'Cero claves residuales del usuario eliminado');

  // Comprobar que el vecino sigue intacto
  StorageService.setActiveTenant('usr_safe_neighbor');
  assert.equal(
    StorageService.getWeighIns().some((w) => w.id === 'w_neighbor_1'),
    true,
    'Los datos de otros usuarios permanecen intactos'
  );
});

test('PRUEBA 5: Las fotografías de progreso son privadas, locales y aisladas por tenant', () => {
  localStorageMock.clear();

  StorageService.setActiveTenant('usr_photo_owner');
  StorageService.saveProgressPhoto({
    id: 'photo_priv_01',
    captured_at: '2026-10-23',
    photo_type: 'frontal',
    image_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
    associated_weight_kg: 80.2,
    notes: 'Foto privada local',
    stage_tag: 'seguimiento',
  });

  assert.equal(
    StorageService.getProgressPhotos().some((p) => p.id === 'photo_priv_01'),
    true
  );

  // Cambiar a otro usuario
  StorageService.setActiveTenant('usr_other_viewer');
  assert.equal(
    StorageService.getProgressPhotos().some((p) => p.id === 'photo_priv_01'),
    false,
    'Otro usuario nunca puede ver las fotografías privadas de usr_photo_owner'
  );
});

test('PRUEBA 6: El panel de administración NO expone datos corporales privados, comidas ni fotografías', async () => {
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@bodytrack.pro',
      password: 'BodyTrackAdmin2026!',
    }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.session.token;

  const usersRes = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(usersRes.status, 200);
  const { users } = await usersRes.json();

  assert.ok(Array.isArray(users) && users.length >= 2);
  for (const u of users) {
    // Verificar que el email está parcialmente ofuscado y que no existen campos biométricos
    assert.ok(u.email.includes('*'), 'El correo debe mostrarse ofuscado en la lista admin');
    assert.equal('weight_kg' in u, false, 'No debe exponer peso');
    assert.equal('waist_cm' in u, false, 'No debe exponer medidas');
    assert.equal('photos' in u, false, 'No debe exponer fotos');
    assert.equal('foodLogs' in u, false, 'No debe exponer comidas');
    assert.equal('passwordHash' in u, false, 'No debe exponer hashes de contraseña');
  }
});

test('PRUEBA 7: La analítica sanitiza y bloquea automáticamente cualquier dato corporal o credencial', () => {
  const rawProps = {
    module_tab: 'weight',
    action_type: 'save',
    weight_kg: 84.5,
    waist_cm: 82.1,
    body_fat: 14.8,
    food_name: 'Pechuga de pollo',
    photo_url: 'data:image/png;base64,secret',
    password: 'MySecretPassword',
    token: 'Bearer xyz',
    email: 'user@private.com',
    sets_count: 4,
  };

  const clean = analytics.sanitizeProperties(rawProps);

  // Propiedades operativas permitidas se conservan
  assert.equal(clean.module_tab, 'weight');
  assert.equal(clean.action_type, 'save');
  assert.equal(clean.sets_count, 4);

  // Todas las propiedades sensibles o biométricas deben haber sido eliminadas
  assert.equal('weight_kg' in clean, false, 'weight_kg bloqueado');
  assert.equal('waist_cm' in clean, false, 'waist_cm bloqueado');
  assert.equal('body_fat' in clean, false, 'body_fat bloqueado');
  assert.equal('food_name' in clean, false, 'food_name bloqueado');
  assert.equal('photo_url' in clean, false, 'photo_url bloqueado');
  assert.equal('password' in clean, false, 'password bloqueado');
  assert.equal('token' in clean, false, 'token bloqueado');
  assert.equal('email' in clean, false, 'email bloqueado');
});

test('PRUEBA 8: El sistema de feedback integrado guarda reportes con ID de seguimiento sin adjuntar datos biométricos', async () => {
  // Iniciar sesión como beta tester para obtener su token
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'beta.tester@bodytrack.pro',
      password: 'BetaTester2026!',
    }),
  });
  assert.equal(loginRes.status, 200);
  const { session } = await loginRes.json();

  const res = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      type: 'suggestion',
      module: 'Nutrición y Macros',
      title: 'Añadir filtro rápido por comidas favoritas',
      description: 'Sería muy útil poder fijar desayunos recurrentes con un clic.',
      priority: 'medium',
      satisfactionScore: 5,
      canContact: true,
      diagnostics: {
        screen: '1440x900',
        app_version: 'beta-2.4',
      },
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(
    data.tracking_id && data.tracking_id.startsWith('FB-2026-'),
    'Debe generar un Tracking ID con formato FB-2026-XXXXXX'
  );
  assert.equal('weighIns' in data.feedback, false);
  assert.equal('photos' in data.feedback, false);
});

test('PRUEBA 9: Diseño responsive y navegación adaptativa verificados (Escritorio + Móvil)', async () => {
  const fs = await import('node:fs');
  const navbarCode = fs.readFileSync('src/components/layout/Navbar.tsx', 'utf-8');
  const mobileNavCode = fs.readFileSync('src/components/layout/MobileNav.tsx', 'utf-8');
  const sidebarCode = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');

  assert.ok(sidebarCode.includes('hidden md:flex'), 'Sidebar debe ocultarse en móvil y mostrarse en desktop (md:flex)');
  assert.ok(mobileNavCode.includes('md:hidden'), 'MobileNav debe mostrarse en móvil y ocultarse en desktop (md:hidden)');
  assert.ok(navbarCode.includes('sm:px-6'), 'Navbar debe contar con paddings adaptativos para móvil y escritorio');
});

test('PRUEBA 10: Los errores de API y autenticación responden sin exponer secretos, trazas internas ni romper la interfaz', async () => {
  const unauthorizedRes = await fetch(`${API_BASE}/api/admin/analytics/summary`, {
    headers: { Authorization: 'Bearer token_invalido_12345' },
  });
  assert.equal(unauthorizedRes.status, 401);
  const bodyText = await unauthorizedRes.text();

  assert.equal(bodyText.includes('GEMINI_API_KEY'), false, 'Nunca debe exponer variables de entorno');
  assert.equal(bodyText.includes('passwordHash'), false, 'Nunca debe exponer hashes');
  assert.equal(bodyText.includes('salt'), false, 'Nunca debe exponer salts criptográficos');
});

test('PRUEBA 11: OnboardingWizard integra Guía de Inicio Rápido con tooltips para primer pesaje y objetivos de calorías', async () => {
  const fs = await import('node:fs');
  const wizardCode = fs.readFileSync('src/components/onboarding/OnboardingWizard.tsx', 'utf-8');
  const guideCode = fs.readFileSync('src/components/onboarding/QuickStartGuide.tsx', 'utf-8');

  assert.ok(wizardCode.includes('QuickStartGuide'), 'OnboardingWizard debe renderizar QuickStartGuide');
  assert.ok(guideCode.includes('tooltip-weighin'), 'QuickStartGuide debe incluir el tooltip visual para el primer pesaje');
  assert.ok(guideCode.includes('tooltip-calories'), 'QuickStartGuide debe incluir el tooltip visual para objetivos de calorías');
  assert.ok(guideCode.includes('role="tooltip"'), 'Los tooltips deben contar con semántica accesible role="tooltip"');
});

test('PRUEBA 12: OnboardingWizard valida selección de unidad de medida y objetivo principal y muestra bienvenida con el nombre del usuario', async () => {
  const { validateOnboardingCompletion, formatWelcomeGreeting } = await import('./onboardingValidation');

  const greeting = formatWelcomeGreeting('Santiago Quinteros');
  assert.equal(greeting.welcomeMessage, '¡Bienvenido, Santiago Quinteros!');

  const missingBoth = validateOnboardingCompletion({
    userName: 'Santiago Quinteros',
    unitOfMeasure: '',
    primaryGoal: '',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });
  assert.equal(missingBoth.canFinish, false);
  assert.equal(missingBoth.isUnitSelected, false);
  assert.equal(missingBoth.isGoalSelected, false);

  const validAll = validateOnboardingCompletion({
    userName: 'Santiago Quinteros',
    unitOfMeasure: 'metric',
    primaryGoal: 'recomp',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });
  assert.equal(validAll.canFinish, true);
  assert.equal(validAll.isUnitSelected, true);
  assert.equal(validAll.isGoalSelected, true);
});


