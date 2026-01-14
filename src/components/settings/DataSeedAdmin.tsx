import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import JSON data for seeding
import taxonomyData from '@/data/taxonomy.json';
import questionsData from '@/data/questions.json';

export function DataSeedAdmin() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const seedAllData = async () => {
    setIsSeeding(true);
    setProgress([]);

    try {
      // 1. Seed frameworks
      addProgress('Iniciando seed de frameworks...');
      const frameworksResponse = await supabase.functions.invoke('seed-data', {
        body: { action: 'seed-frameworks' }
      });
      
      if (frameworksResponse.error) throw new Error(frameworksResponse.error.message);
      addProgress('✓ Frameworks inseridos com sucesso');

      // 2. Seed domains
      addProgress('Inserindo domínios...');
      const domainsResponse = await supabase.functions.invoke('seed-data', {
        body: { 
          action: 'seed-domains',
          data: { domains: taxonomyData.domains }
        }
      });
      
      if (domainsResponse.error) throw new Error(domainsResponse.error.message);
      addProgress(`✓ ${taxonomyData.domains.length} domínios inseridos`);

      // 3. Seed subcategories
      addProgress('Inserindo subcategorias...');
      const subcategoriesResponse = await supabase.functions.invoke('seed-data', {
        body: { 
          action: 'seed-subcategories',
          data: { subcategories: taxonomyData.subcategories }
        }
      });
      
      if (subcategoriesResponse.error) throw new Error(subcategoriesResponse.error.message);
      addProgress(`✓ ${taxonomyData.subcategories.length} subcategorias inseridas`);

      // 4. Seed questions
      addProgress('Inserindo perguntas (pode levar alguns segundos)...');
      const questionsResponse = await supabase.functions.invoke('seed-data', {
        body: { 
          action: 'seed-questions',
          data: { questions: questionsData.questions }
        }
      });
      
      if (questionsResponse.error) throw new Error(questionsResponse.error.message);
      addProgress(`✓ ${questionsData.questions.length} perguntas inseridas`);

      addProgress('');
      addProgress('🎉 Seed completo! Todos os dados foram migrados para o banco de dados.');
      toast.success('Dados migrados com sucesso!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addProgress(`❌ Erro: ${errorMessage}`);
      toast.error('Erro ao migrar dados: ' + errorMessage);
    } finally {
      setIsSeeding(false);
    }
  };

  const checkDataStatus = async () => {
    setProgress([]);
    addProgress('Verificando status dos dados...');

    try {
      const [frameworks, domains, subcategories, questions] = await Promise.all([
        supabase.from('default_frameworks').select('framework_id', { count: 'exact', head: true }),
        supabase.from('domains').select('domain_id', { count: 'exact', head: true }),
        supabase.from('subcategories').select('subcat_id', { count: 'exact', head: true }),
        supabase.from('default_questions').select('question_id', { count: 'exact', head: true })
      ]);

      addProgress(`Frameworks: ${frameworks.count || 0}`);
      addProgress(`Domínios: ${domains.count || 0}`);
      addProgress(`Subcategorias: ${subcategories.count || 0}`);
      addProgress(`Perguntas: ${questions.count || 0}`);

      const total = (frameworks.count || 0) + (domains.count || 0) + 
                    (subcategories.count || 0) + (questions.count || 0);
      
      if (total === 0) {
        addProgress('');
        addProgress('⚠️ Banco de dados vazio. Execute o seed para migrar os dados.');
      } else {
        addProgress('');
        addProgress('✓ Dados encontrados no banco de dados.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      addProgress(`❌ Erro ao verificar: ${errorMessage}`);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Migração de Dados para o Banco</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Esta ferramenta migra os dados dos arquivos JSON locais para as tabelas do banco de dados.
        Execute apenas uma vez ou para atualizar os dados base.
      </p>

      <div className="flex gap-2 mb-4">
        <Button 
          onClick={seedAllData} 
          disabled={isSeeding}
        >
          {isSeeding ? 'Migrando...' : 'Executar Seed Completo'}
        </Button>
        <Button 
          variant="outline" 
          onClick={checkDataStatus}
          disabled={isSeeding}
        >
          Verificar Status
        </Button>
      </div>

      {progress.length > 0 && (
        <div className="bg-muted p-4 rounded-lg font-mono text-sm max-h-64 overflow-auto">
          {progress.map((line, idx) => (
            <div key={idx} className={line.startsWith('❌') ? 'text-red-500' : line.startsWith('✓') || line.startsWith('🎉') ? 'text-green-500' : ''}>
              {line || <br />}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
