# cursor-editor-articulacao Specification

## Purpose
Define onde o cursor de texto pode ficar no editor de articulação e como ele navega entre as linhas, impedindo que o usuário edite linhas estruturais que não representam texto da proposição.

## Requirements

### Requirement: Linha raiz da articulação não recebe o cursor
O editor de articulação SHALL impedir que o cursor de texto permaneça na linha raiz exibida antes da ementa (ou antes do primeiro dispositivo, quando não há ementa). Quando a seleção cair nessa linha, o editor MUST movê-la para o início da primeira linha de conteúdo seguinte.

#### Scenario: Clique na linha raiz
- **WHEN** o usuário clica na área da linha raiz, acima da ementa
- **THEN** o cursor fica no início do texto da ementa
- **AND** a ementa passa a ser a linha selecionada no editor

#### Scenario: Linha raiz sem ementa
- **WHEN** o documento não exibe ementa (por exemplo, emenda "artigo onde couber") e a seleção cai na linha raiz
- **THEN** o cursor fica no início do texto do primeiro dispositivo exibido

### Requirement: Texto não pode ser inserido antes da ementa
O editor de articulação MUST NOT permitir inserir texto, quebras de linha ou conteúdo colado em qualquer posição anterior à primeira linha de conteúdo.

#### Scenario: Digitação após tentar posicionar o cursor acima da ementa
- **WHEN** o usuário tenta posicionar o cursor acima da ementa e digita um texto
- **THEN** nenhum texto aparece acima da ementa
- **AND** a digitação é tratada como edição da ementa, onde o cursor está, seguindo as regras de edição dessa linha

### Requirement: Seta para cima na primeira linha de conteúdo
O editor de articulação SHALL manter o cursor na primeira linha de conteúdo quando o usuário pressionar a seta para cima com o cursor no início dessa linha.

#### Scenario: Seta para cima no início da ementa
- **WHEN** o cursor está no início do texto da ementa e o usuário pressiona a seta para cima
- **THEN** o cursor continua no início do texto da ementa

#### Scenario: Seta para cima no início do primeiro dispositivo sem ementa
- **WHEN** o documento não exibe ementa, o cursor está no início do primeiro dispositivo e o usuário pressiona a seta para cima
- **THEN** o cursor continua no início do texto desse dispositivo
