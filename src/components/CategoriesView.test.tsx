import { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesView } from './CategoriesView';
import { DEFAULT_PREFERENCES } from '../data/defaults';
import {
  BackupPayload,
  normalizeEntry,
  loadCategories,
  buildBackupJson,
} from '../utils/storage';
import { Experiment, PulseEntry } from '../types/pulsetrack';

let blobs: Blob[] = [];

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function renderView(overrides: Partial<ComponentProps<typeof CategoriesView>> = {}) {
  const props: ComponentProps<typeof CategoriesView> = {
    categories: loadCategories(),
    entries: [normalizeEntry({ id: 'atual', date: '2026-11-10' })],
    experiments: [] as Experiment[],
    preferences: DEFAULT_PREFERENCES,
    onChangePreferences: vi.fn(),
    onUpdateCategories: vi.fn(),
    onResetDefaultCategories: vi.fn(),
    onImportBackup: vi.fn(() => true),
    onLoadSampleData: vi.fn(),
    onClearAllEntries: vi.fn(),
    onToggleFocusModeDefault: vi.fn(),
    onToggleShowSexualCategory: vi.fn(),
    onToggleTrackCycle: vi.fn(),
    onRestartOnboarding: vi.fn(),
    onFeedback: vi.fn(),
    ...overrides,
  };

  const view = render(<CategoriesView {...props} />);
  const fileInput = view.container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;

  return { props, fileInput };
}

function selectFile(input: HTMLInputElement, content: string, name = 'backup.json') {
  const file = new File([content], name, { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
}

const importedEntry: PulseEntry = normalizeEntry({
  id: 'importado',
  date: '2026-11-01',
  time: '09:00',
});

beforeEach(() => {
  blobs = [];
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:test-${blobs.length}`;
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CategoriesView — importação de backup', () => {
  it('mostra prévia com contagens reais e só importa após confirmação explícita', async () => {
    const onImportBackup = vi.fn((_backup: BackupPayload) => true);
    const { fileInput } = renderView({ onImportBackup });
    const content = buildBackupJson(
      [importedEntry],
      loadCategories(),
      DEFAULT_PREFERENCES,
      []
    );

    selectFile(fileInput, content);

    const panel = await screen.findByRole('region', {
      name: 'Confirmação de importação de backup',
    });
    expect(
      within(panel).getByRole('heading', { name: 'Confirmar substituição dos dados' })
    ).toBe(document.activeElement);
    expect(within(panel).getByText(/Este backup contém 1 registro/)).toBeTruthy();
    expect(
      within(panel).getByText(/substituirá os dados atualmente salvos neste navegador/)
    ).toBeTruthy();
    expect(within(panel).getByText(/Versão 3 do backup/)).toBeTruthy();
    expect(onImportBackup).not.toHaveBeenCalled();

    fireEvent.click(
      within(panel).getByRole('button', { name: 'Substituir dados pelo backup' })
    );

    await waitFor(() => expect(onImportBackup).toHaveBeenCalledTimes(1));
    expect(onImportBackup.mock.calls[0]?.[0].entries[0]?.id).toBe('importado');
    expect(
      screen.queryByRole('region', { name: 'Confirmação de importação de backup' })
    ).toBeNull();
  });

  it('baixa uma cópia dos dados atuais antes de substituir', async () => {
    const { fileInput } = renderView();
    const content = buildBackupJson(
      [importedEntry],
      loadCategories(),
      DEFAULT_PREFERENCES,
      []
    );

    selectFile(fileInput, content);
    const panel = await screen.findByRole('region', {
      name: 'Confirmação de importação de backup',
    });
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Substituir dados pelo backup' })
    );

    await waitFor(() => expect(blobs).toHaveLength(1));
    const safetyCopy = JSON.parse(await readBlob(blobs[0]));
    expect(safetyCopy.entries).toHaveLength(1);
    expect(safetyCopy.entries[0].id).toBe('atual');
    expect(safetyCopy.entries[0].id).not.toBe('importado');
  });

  it('cancela sem alterar dados e sem chamar a importação', async () => {
    const onImportBackup = vi.fn(() => true);
    const { fileInput } = renderView({ onImportBackup });

    selectFile(
      fileInput,
      buildBackupJson([importedEntry], loadCategories(), DEFAULT_PREFERENCES, [])
    );
    const panel = await screen.findByRole('region', {
      name: 'Confirmação de importação de backup',
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancelar importação' }));

    expect(onImportBackup).not.toHaveBeenCalled();
    expect(blobs).toHaveLength(0);
    expect(
      screen.queryByRole('region', { name: 'Confirmação de importação de backup' })
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Importar backup JSON' })).toBe(
      document.activeElement
    );
  });

  it('recusa JSON inválido sem abrir confirmação', async () => {
    const onImportBackup = vi.fn(() => true);
    const { fileInput } = renderView({ onImportBackup });

    selectFile(fileInput, '{nao-e-json');

    expect((await screen.findByRole('alert')).textContent).toContain(
      'não é um JSON válido'
    );
    expect(onImportBackup).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('region', { name: 'Confirmação de importação de backup' })
    ).toBeNull();
  });

  it('recusa JSON sintaticamente válido, mas incompatível com o esquema', async () => {
    const onImportBackup = vi.fn(() => true);
    const { fileInput } = renderView({ onImportBackup });

    selectFile(
      fileInput,
      JSON.stringify({ app: 'PulseTrack', version: 3, entries: [{}], categories: [] })
    );

    expect((await screen.findByRole('alert')).textContent).toContain('dados incompatíveis');
    expect(onImportBackup).not.toHaveBeenCalled();
  });

  it('recusa backup de versão futura sem tentar interpretá-lo', async () => {
    const onImportBackup = vi.fn(() => true);
    const { fileInput } = renderView({ onImportBackup });

    selectFile(
      fileInput,
      JSON.stringify({ app: 'PulseTrack', version: 4, entries: [], categories: [] })
    );

    expect((await screen.findByRole('alert')).textContent).toContain('versão mais nova');
    expect(onImportBackup).not.toHaveBeenCalled();
  });

  it('mantém a confirmação e avisa quando a persistência falha', async () => {
    const onImportBackup = vi.fn(() => false);
    const { fileInput } = renderView({ onImportBackup });

    selectFile(
      fileInput,
      buildBackupJson([importedEntry], loadCategories(), DEFAULT_PREFERENCES, [])
    );
    const panel = await screen.findByRole('region', {
      name: 'Confirmação de importação de backup',
    });
    fireEvent.click(
      within(panel).getByRole('button', { name: 'Substituir dados pelo backup' })
    );

    await waitFor(() => expect(onImportBackup).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert').textContent).toContain('Nada foi alterado');
    expect(
      screen.getByRole('region', { name: 'Confirmação de importação de backup' })
    ).toBeTruthy();
  });

  it('permite prévia de backup sem experimentos e sem categorias', async () => {
    const { fileInput } = renderView();

    selectFile(fileInput, buildBackupJson([], [], DEFAULT_PREFERENCES, []));

    const panel = await screen.findByRole('region', {
      name: 'Confirmação de importação de backup',
    });
    expect(
      within(panel).getByText(/0 registros, 0 categorias e 0 experimentos/)
    ).toBeTruthy();
  });
});

describe('CategoriesView — preferências do onboarding', () => {
  it('permite editar foco e profundidade inicial depois do onboarding', () => {
    const onChangePreferences = vi.fn();
    renderView({ onChangePreferences });

    fireEvent.click(screen.getByRole('button', { name: 'Sono' }));
    fireEvent.click(screen.getByRole('button', { name: 'Padrão' }));

    expect(onChangePreferences).toHaveBeenCalledWith({ focusAreas: ['sono'] });
    expect(onChangePreferences).toHaveBeenCalledWith({ defaultRecordLevel: 'padrao' });
    expect(screen.getByText(/Não disponíveis nesta versão/)).toBeTruthy();
  });
});
