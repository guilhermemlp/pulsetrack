import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createDefaultCategories, createSampleEntries } from './data/defaults';
import {
  loadCategories,
  loadEntries,
  loadExperiments,
  normalizeEntry,
  saveCategories,
  saveEntries,
  saveExperiments,
  saveOnboardingProgress,
} from './utils/storage';
import { createExperiment } from './utils/experiments';
import { BehaviorCategory, Experiment, PulseEntry } from './types/pulsetrack';

let blobs: Blob[] = [];

const realEntry: PulseEntry = normalizeEntry({
  id: 'real_1',
  date: '2026-11-10',
  time: '09:00',
});

const realCategory: BehaviorCategory = {
  ...createDefaultCategories()[0],
  id: 'cat_real',
  name: 'Categoria real',
  items: [],
};

const realExperiment: Experiment = createExperiment({
  hypothesis: 'Observar energia à noite',
  metric: 'energy',
  startDate: '2026-11-01',
  endDate: '2026-11-14',
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function seedApp(entries: PulseEntry[] = [], options: {
  categories?: BehaviorCategory[];
  experiments?: Experiment[];
} = {}) {
  saveOnboardingProgress({
    status: 'completed',
    step: 3,
    skippedSteps: [],
    completedAt: '2026-11-01T10:00:00.000Z',
    lastSeenAt: '2026-11-01T10:00:00.000Z',
  });
  saveEntries(entries);
  saveCategories(options.categories ?? createDefaultCategories());
  saveExperiments(options.experiments ?? []);
}

function navigate(name: string) {
  fireEvent.click(screen.getAllByRole('button', { name })[0]);
}

beforeEach(() => {
  localStorage.clear();
  blobs = [];
  window.scrollTo = vi.fn();
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
  localStorage.clear();
});

describe('App — dados de exemplo', () => {
  it('carrega direto em uma instalação sem registros e identifica os exemplos', async () => {
    seedApp();
    render(<App />);

    navigate('Visão geral');
    fireEvent.click(
      screen.getByRole('button', { name: /Explorar com exemplo longitudinal/ })
    );

    await waitFor(() => expect(loadEntries()).toHaveLength(14));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(blobs).toHaveLength(0);
    expect(await screen.findByText('Dados de exemplo em uso')).toBeTruthy();
    expect(screen.getByText(/Todos os 14 registros são ilustrativos/)).toBeTruthy();
  });

  it('com registros reais, abre confirmação e cancelar mantém tudo intacto', async () => {
    seedApp([realEntry], {
      categories: [realCategory],
      experiments: [realExperiment],
    });
    render(<App />);

    navigate('Ajustes');
    fireEvent.click(
      screen.getByRole('button', { name: /Carregar exemplo ilustrativo/ })
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Substituir seus registros pelos exemplos?',
    });
    expect(dialog.textContent).toContain('1 registro salvo');
    expect(loadEntries()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(loadEntries().map((entry) => entry.id)).toEqual(['real_1']);
    expect(loadCategories()[0]?.id).toBe('cat_real');
    expect(loadExperiments()[0]?.id).toBe(realExperiment.id);
    expect(blobs).toHaveLength(0);
  });

  it('só substitui após confirmação, baixa backup e preserva as outras estruturas', async () => {
    seedApp([realEntry], {
      categories: [realCategory],
      experiments: [realExperiment],
    });
    const view = render(<App />);

    navigate('Ajustes');
    const sampleButton = screen.getByRole('button', {
      name: /Carregar exemplo ilustrativo/,
    });
    fireEvent.click(sampleButton);
    screen.getByRole('dialog', {
      name: 'Substituir seus registros pelos exemplos?',
    });
    expect(loadEntries()).toHaveLength(1);

    fireEvent.click(
      screen.getByRole('button', { name: 'Substituir registros pelos exemplos' })
    );

    await waitFor(() => expect(loadEntries()).toHaveLength(14));
    expect(loadEntries().every((entry) => entry.id.startsWith('demo_'))).toBe(true);
    expect(loadCategories()[0]?.id).toBe('cat_real');
    expect(loadExperiments()[0]?.id).toBe(realExperiment.id);
    expect(blobs).toHaveLength(1);

    const safetyCopy = JSON.parse(await readBlob(blobs[0]));
    expect(safetyCopy.entries).toHaveLength(1);
    expect(safetyCopy.entries[0].id).toBe('real_1');
    expect(safetyCopy.categories[0].id).toBe('cat_real');
    expect(safetyCopy.experiments[0].id).toBe(realExperiment.id);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Dados de exemplo em uso')).toBeTruthy();

    view.unmount();
    render(<App />);
    expect(await screen.findByText('Dados de exemplo em uso')).toBeTruthy();
    expect(loadEntries()).toHaveLength(14);
  });

  it('aborta a substituição quando a cópia de segurança não pode ser gerada', async () => {
    seedApp([realEntry]);
    render(<App />);

    navigate('Ajustes');
    fireEvent.click(
      screen.getByRole('button', { name: /Carregar exemplo ilustrativo/ })
    );
    screen.getByRole('dialog', {
      name: 'Substituir seus registros pelos exemplos?',
    });

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => {
        throw new Error('download indisponível');
      }),
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Substituir registros pelos exemplos' })
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Não foi possível gerar a cópia dos dados atuais'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(loadEntries().map((entry) => entry.id)).toEqual(['real_1']);
  });

  it('mantém os dados e a confirmação quando a gravação dos exemplos falha', async () => {
    seedApp([realEntry]);
    render(<App />);

    navigate('Ajustes');
    fireEvent.click(
      screen.getByRole('button', { name: /Carregar exemplo ilustrativo/ })
    );
    screen.getByRole('dialog', {
      name: 'Substituir seus registros pelos exemplos?',
    });

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota excedida');
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Substituir registros pelos exemplos' })
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Não foi possível gravar os registros de exemplo'
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(loadEntries().map((entry) => entry.id)).toEqual(['real_1']);
  });

  it('identifica mistura de exemplos com dados reais e remove só os exemplos', async () => {
    const sample = createSampleEntries()[0];
    seedApp([sample, realEntry]);
    render(<App />);

    expect(
      screen.getByText(/1 de 2 registros são ilustrativos/)
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remover dados de exemplo' })
    );

    await waitFor(() =>
      expect(loadEntries().map((entry) => entry.id)).toEqual(['real_1'])
    );
    expect(screen.queryByText('Dados de exemplo em uso')).toBeNull();
  });
});
