/**
 * Baixa um conteúdo de texto como arquivo no navegador. Devolve `false` quando o
 * ambiente não permite criar o link ou iniciar o download, para que o chamador
 * possa abortar operações que dependem da cópia de segurança.
 */
export function downloadJson(content: string, filename: string): boolean {
  try {
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
