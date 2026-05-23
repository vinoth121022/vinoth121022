import re
import sys

with open('apps/player-app/src/App.tsx', 'r') as f:
    content = f.read()

# 1. Insert adminStyles and GeminiButton
gemini_injection = """
const adminStyles = `
@keyframes rotate-sweep {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes gemini-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
.gemini-button-container {
  position: relative;
  overflow: hidden;
  border-radius: 9999px;
  padding: 2px;
  display: inline-flex;
  cursor: pointer;
}
.gemini-button-glow {
  position: absolute;
  inset: -100%;
  background: conic-gradient(from 0deg, transparent 0%, transparent 30%, #3b82f6 40%, #8b5cf6 50%, #ec4899 60%, transparent 70%);
  animation: rotate-sweep 4s linear infinite;
}
.gemini-button-inner {
  position: relative;
  background-color: #090b11;
  border-radius: 9999px;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  backdrop-filter: blur(10px);
}
.gemini-button-text {
  background: linear-gradient(to right, #60a5fa, #c084fc, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 600;
  font-size: 14px;
}
.gemini-glass-panel {
  background: rgba(17, 22, 37, 0.7) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3) !important;
}
`;

const Div = 'div' as any;
const Span = 'span' as any;
const Style = 'style' as any;

function GeminiButton({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  const runtime = globalThis as { document?: Document };
  if (!runtime.document) {
    return <ActionButton label={label} onPress={onPress} accent={accent} />;
  }
  return (
    <Div className="gemini-button-container" onClick={onPress}>
      {accent && <Div className="gemini-button-glow" />}
      <Div className="gemini-button-inner" style={{ backgroundColor: accent ? '#090b11' : '#1f293d' }}>
        <Span className="gemini-button-text" style={accent ? {} : { background: 'none', WebkitTextFillColor: '#e2e8f0', color: '#e2e8f0' }}>{label}</Span>
      </Div>
    </Div>
  );
}

function AnimationStudioAdmin({"""

content = content.replace("function AnimationStudioAdmin({", gemini_injection)

# 2. Add adminTab state
state_injection = """  const [studioPieceSets, setStudioPieceSets] = useState<PieceSet[]>(data.pieceSets);
  const [adminTab, setAdminTab] = useState<"skins" | "assets" | "moves">("skins");"""
content = content.replace("  const [studioPieceSets, setStudioPieceSets] = useState<PieceSet[]>(data.pieceSets);", state_injection)

# 3. Replace Panel component definition to include className
panel_replacement = """function Panel({ title, children }: { title: string; children: ReactNode }) {
  const headerIcon = iconForPanel(title);
  return (
    <View style={styles.panel} className="gemini-glass-panel">"""
content = content.replace("""function Panel({ title, children }: { title: string; children: ReactNode }) {
  const headerIcon = iconForPanel(title);
  return (
    <View style={styles.panel}>""", panel_replacement)

# 4. Replace the return statement
# We need to find the exact boundary of the return statement
start_idx = content.find("  return (\n    <Panel title=\"Ceremony Studio\">")
end_idx = content.find("  );\n}\n\nfunction adjustedAnimationDuration(", start_idx) + 4

new_return = """  return (
    <Panel title="Ceremony Studio">
      <Style>{adminStyles}</Style>
      <View style={[styles.animationStudioHero, { backgroundColor: 'transparent' }]} className="gemini-glass-panel">
        <View>
          <Text style={styles.animationStudioTitle}>Ceremony Animation Studio</Text>
          <Text style={styles.animationStudioCopy}>Configure only two shareable moments: the opening king handshake and the final checkmate finisher.</Text>
        </View>
        <View style={styles.animationStudioHeroBadge}>
          <Text style={styles.animationStudioHeroBadgeText}>New rule</Text>
          <Text style={styles.animationStudioHeroBadgeMeta}>No mid-game move clips</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, marginTop: 16 }}>
        <Pressable onPress={() => setAdminTab('skins')} style={[styles.actionPill, adminTab === 'skins' && styles.actionPillActive, { flex: 1 }]}><Text style={[styles.actionPillText, adminTab === 'skins' && styles.actionPillTextActive, { textAlign: 'center' }]}>Piece Set (Skins)</Text></Pressable>
        <Pressable onPress={() => setAdminTab('assets')} style={[styles.actionPill, adminTab === 'assets' && styles.actionPillActive, { flex: 1 }]}><Text style={[styles.actionPillText, adminTab === 'assets' && styles.actionPillTextActive, { textAlign: 'center' }]}>Animation Assets</Text></Pressable>
        <Pressable onPress={() => setAdminTab('moves')} style={[styles.actionPill, adminTab === 'moves' && styles.actionPillActive, { flex: 1 }]}><Text style={[styles.actionPillText, adminTab === 'moves' && styles.actionPillTextActive, { textAlign: 'center' }]}>Moves Selection</Text></Pressable>
      </View>

      {adminTab === 'skins' && (
        <View className="gemini-glass-panel" style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioInlineForm}>
            <TextInput value={newPieceSetName} onChangeText={setNewPieceSetName} placeholder="Piece set name" placeholderTextColor="#8aa0b6" style={styles.animationStudioInput} />
            <GeminiButton label="Create Piece Set" onPress={() => void createPieceSet()} accent />
            <GeminiButton label="Duplicate Selected" onPress={() => void duplicatePieceSet()} />
          </View>
          <View style={styles.pieceSetCardGrid}>
            {studioPieceSets.map((pieceSet) => {
              const uploadedCount = pieceOrder.filter((piece) => pieceSet.pieces[piece]).length;
              const attachedSetCount = data.animationSets.filter((set) => set.pieceSetId === pieceSet.id).length;
              const active = pieceSet.id === selectedPieceSet?.id;
              return (
                <Pressable key={pieceSet.id} onPress={() => setSelectedPieceSetId(pieceSet.id)} style={({ pressed }) => [styles.pieceSetCard, active && styles.pieceSetCardActive, pressed && styles.pressed]}>
                  <View style={styles.pieceSetCardHeader}>
                    <Text style={styles.pieceSetCardTitle}>{pieceSet.name}</Text>
                    {pieceSet.isSeededExample && <Text style={styles.seedBadge}>Starter</Text>}
                  </View>
                  <Text numberOfLines={2} style={styles.muted}>{pieceSet.description}</Text>
                  <View style={styles.pieceSetRosterStrip}>
                    {pieceOrder.map((piece) => (
                      <View key={piece} style={[styles.pieceRosterPip, !pieceSet.pieces[piece] && styles.pieceRosterPipMissing]}>
                        <Text style={styles.pieceRosterPipText}>{pieceGlyphs[piece]}</Text>
                      </View>
                    ))}
                  </View>
                  <StatLine label="Uploaded pieces" value={`${uploadedCount}/6`} />
                  <StatLine label="Clips" value={String(pieceSet.animationClipIds.length)} />
                  <StatLine label="Animation sets" value={String(attachedSetCount)} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {adminTab === 'assets' && selectedPieceSet && (
        <View className="gemini-glass-panel" style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioSectionHeader}>
            <View>
              <Text style={styles.animationStudioSubTitle}>Six-Piece Roster</Text>
              <Text style={styles.muted}>Select a piece and attach GLB assets to slots.</Text>
            </View>
          </View>
          <View style={styles.pieceRosterGrid}>
            {pieceOrder.map((piece) => {
              const uploaded = Boolean(selectedPieceSet.pieces[piece]);
              return (
                <Pressable key={piece} onPress={() => setSelectedPiece(piece)} style={({ pressed }) => [styles.pieceRosterCard, selectedPiece === piece && styles.pieceRosterCardActive, pressed && styles.pressed]}>
                  <View style={[styles.pieceRosterPreview, !uploaded && styles.pieceRosterPreviewMissing]}>
                    <RosterPiecePreview asset={selectedPieceSet.pieces[piece]} piece={piece} />
                  </View>
                  <Text style={styles.pieceRosterName}>{pieceNames[piece]}</Text>
                  <Text style={styles.muted}>{uploaded ? "Uploaded" : "Not uploaded yet"}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.animationBuilderGrid}>
            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Asset Upload ({pieceNames[selectedPiece]})</Text>
              <Text style={styles.muted}>Upload ceremony-ready files for this piece.</Text>
              <View style={styles.assetSlotGrid}>
                {pieceAssetSlots.map((slot) => {
                  const slotAsset = selectedPieceAsset?.assetSlots?.[slot.key];
                  const active = selectedAssetSlot === slot.key;
                  return (
                    <Pressable key={slot.key} onPress={() => setSelectedAssetSlot(slot.key)} style={({ pressed }) => [styles.assetSlotCard, active && styles.assetSlotCardActive, pressed && styles.pressed]}>
                      <Text style={[styles.assetSlotTitle, active && styles.assetSlotTitleActive]}>{slot.label}</Text>
                      <Text numberOfLines={2} style={styles.assetSlotDescription}>{slot.description}</Text>
                      <Text style={[styles.assetSlotStatus, slotAsset && styles.assetSlotStatusReady]}>{slotAsset ? "Attached" : "Missing"}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text numberOfLines={1} style={styles.assetPathText}>
                {selectedSlotAsset?.path ?? (selectedAssetSlot === "static" && selectedPieceAsset?.glbPath ? selectedPieceAsset.glbPath : `${pieceNames[selectedPiece]} ${selectedSlotMeta.label} is missing.`)}
              </Text>
              <View style={styles.assetUploadBox}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  numberOfLines={1}
                  onChangeText={(value) => {
                    setSelectedUploadFile(null);
                    setUploadPath(value);
                  }}
                  placeholder={selectedSlotMeta.accepts === "image" ? "Paste reference image URL/path" : "Paste GLB path"}
                  placeholderTextColor="#8aa0b6"
                  selectTextOnFocus
                  style={[styles.animationStudioInput, styles.animationStudioInputFixed]}
                  value={uploadPath}
                />
              </View>
              <View style={styles.assetUploadActions}>
                <GeminiButton label={selectedSlotMeta.accepts === "image" ? "Choose Image" : "Choose GLB"} onPress={chooseGlbFile} />
                <GeminiButton label={`Attach ${selectedSlotMeta.label}`} onPress={() => void attachGlbToPiece()} accent />
              </View>
              {assetFeedback && (
                <Text style={[styles.saveFeedback, assetFeedback.tone === "error" && styles.saveFeedbackError, assetFeedback.tone === "saving" && styles.saveFeedbackSaving]}>
                  {assetFeedback.text}
                </Text>
              )}
            </View>
            <View style={styles.animationBuilderPanel}>
              <View style={styles.referencePreviewHeader}>
                <Text style={styles.previewSequenceLabel}>Reference Image</Text>
                <Text numberOfLines={1} style={styles.referencePreviewPath}>{selectedPieceAsset?.assetSlots?.reference?.path ? selectedPieceAsset.assetSlots.reference.path.split("/").pop() : "Upload reference image slot"}</Text>
              </View>
              <UploadedReferenceImagePreview path={selectedPieceAsset?.assetSlots?.reference?.path} />
            </View>
          </View>
        </View>
      )}

      {adminTab === 'moves' && selectedPieceSet && (
        <View className="gemini-glass-panel" style={{ padding: 16, borderRadius: 12 }}>
          <View style={styles.animationStudioSectionHeader}>
            <View>
              <Text style={styles.animationStudioSubTitle}>Moves Selection</Text>
              <Text style={styles.muted}>Assemble ceremony rules from your uploaded animation clips.</Text>
            </View>
            <GeminiButton label="New Animation Set" onPress={() => void createAnimationSet()} accent />
          </View>

          <View style={styles.ceremonyCoveragePanel}>
            <View style={styles.ceremonyCoverageHeader}>
              <Text style={styles.animationStudioSubTitle}>Select Piece</Text>
              <Text style={styles.ceremonyCoverageBadge}>GLB only</Text>
            </View>
            <View style={styles.ceremonyCoverageGrid}>
              {pieceOrder.map((piece) => {
                const openingRule = piece === "k" ? selectedAnimationSet?.rules.find((rule) => rule.piece === piece && rule.action === "game-start-handshake") : undefined;
                const finisherRule = selectedAnimationSet?.rules.find((rule) => rule.piece === piece && rule.action === "checkmate-finisher");
                const focusAction: AnimationAction = piece === "k" && openingRule ? "game-start-handshake" : "checkmate-finisher";
                const previewRule = piece === "k" ? openingRule ?? finisherRule : finisherRule;
                const previewClip = firstClipForRule(previewRule);
                const previewGlbPath = previewClip?.sourceGlbPath;
                const uploaded = Boolean(selectedPieceSet.pieces[piece]);
                const hasRuleGlb = Boolean(previewGlbPath && canLoadGlbPath(previewGlbPath));
                return (
                  <Pressable
                    key={`coverage-${piece}`}
                    onPress={() => selectCeremonyCoverage(piece, focusAction)}
                    style={({ pressed }) => [styles.ceremonyCoverageCard, selectedPiece === piece && styles.ceremonyCoverageCardActive, pressed && styles.pressed]}
                  >
                    <View style={styles.ceremonyCoveragePiece}>
                      {hasRuleGlb ? (
                        <GlbModelPreview key={`coverage-${piece}-${previewGlbPath}-${previewClip?.name ?? ""}`} clipName={previewClip?.name} glbPath={previewGlbPath} piece={piece} />
                      ) : (
                        <RosterPiecePreview asset={selectedPieceSet.pieces[piece]} piece={piece} />
                      )}
                    </View>
                    <View style={styles.ceremonyCoverageCopy}>
                      <Text style={styles.ceremonyCoveragePieceName}>{pieceNames[piece]}</Text>
                      {piece === "k" && <Text numberOfLines={2} style={styles.ceremonyCoverageRule}>Opening: {animationRuleSummary(openingRule)}</Text>}
                      <Text numberOfLines={2} style={styles.ceremonyCoverageRule}>Checkmate: {animationRuleSummary(finisherRule)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.animationBuilderGrid}>
            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Ceremony trigger</Text>
              <View style={styles.actionPillWrap}>
                {actionOptions.map((option) => (
                  <Pressable key={option.id} onPress={() => setSelectedAction(option.id)} style={({ pressed }) => [styles.actionPill, selectedAction === option.id && styles.actionPillActive, pressed && styles.pressed]}>
                    <Text style={[styles.actionPillText, selectedAction === option.id && styles.actionPillTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.animationStudioSubTitle}>Speed</Text>
              <View style={styles.speedSegment}>
                {speedOptions.map((speed) => (
                  <Pressable key={speed} onPress={() => setSelectedSpeed(speed)} style={[styles.speedOption, selectedSpeed === speed && styles.speedOptionActive]}>
                    <Text style={[styles.speedOptionText, selectedSpeed === speed && styles.speedOptionTextActive]}>{speed}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.animationStudioSubTitle, { marginTop: 16 }]}>Clip Library</Text>
              <ScrollView style={styles.clipLibrary} nestedScrollEnabled>
                {clips.length === 0 ? (
                  <Text style={styles.muted}>Upload a GLB or use the system ceremony clips.</Text>
                ) : (
                  clips.map((clip) => (
                    <Pressable key={clip.id} onPress={() => setStack((current) => [...current, clip.id])} style={({ pressed }) => [styles.clipCard, pressed && styles.pressed]}>
                      <View style={styles.clipCopy}>
                        <Text numberOfLines={1} style={styles.clipTitle}>{clip.name}</Text>
                        <Text numberOfLines={1} style={styles.muted}>{Math.round(clip.durationMs / 100) / 10}s · {clip.tags.join(", ")}</Text>
                      </View>
                      <Text style={styles.clipAdd}>Add</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>

            <View style={styles.animationBuilderPanel}>
              <Text style={styles.animationStudioSubTitle}>Stack + Preview</Text>
              <View style={styles.stackList}>
                {stack.map((clipId, index) => {
                  const clip = studioAnimationClips.find((item) => item.id === clipId);
                  return (
                    <View key={`${clipId}-${index}`} style={styles.stackItem}>
                      <Text style={styles.stackOrder}>{index + 1}</Text>
                      <View style={styles.stackCopy}>
                        <Text numberOfLines={1} style={styles.clipTitle}>{clip?.name ?? clipId}</Text>
                        <Text numberOfLines={1} style={styles.muted}>{animationActionLabel(selectedAction)} · {selectedSpeed}</Text>
                      </View>
                      <Pressable onPress={() => moveStackItem(index, -1)} style={styles.stackButton}><Text style={styles.stackButtonText}>↑</Text></Pressable>
                      <Pressable onPress={() => moveStackItem(index, 1)} style={styles.stackButton}><Text style={styles.stackButtonText}>↓</Text></Pressable>
                      <Pressable onPress={() => setStack((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.stackButton}><Text style={styles.stackButtonText}>×</Text></Pressable>
                    </View>
                  );
                })}
              </View>
              <View style={styles.animationPreviewStage}>
                <AnimationBoardPreview action={selectedAction} clips={studioAnimationClips} piece={selectedPiece} pieceAsset={selectedPieceAsset} signature={previewSignature} speed={selectedSpeed} stack={stack} />
              </View>
              <View style={styles.previewSequenceBar}>
                <Text style={styles.previewSequenceLabel}>Live sequence</Text>
                <Text numberOfLines={2} style={styles.previewSequenceText}>
                  {previewClipNames.length > 0 ? `${previewClipNames.join(" -> ")} · ${(previewDuration / 1000).toFixed(1)}s` : "No clips selected"}
                </Text>
              </View>
              <GeminiButton label="Save Ceremony" onPress={() => void saveRule()} accent={stack.length > 0 && Boolean(selectedAnimationSet)} />
              {saveFeedback && (
                <Text style={[styles.saveFeedback, saveFeedback.tone === "error" && styles.saveFeedbackError, saveFeedback.tone === "saving" && styles.saveFeedbackSaving]}>
                  {saveFeedback.text}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.savedRulesWrap}>
            <Text style={styles.animationStudioSubTitle}>Configured Ceremonies ({pieceNames[selectedPiece]})</Text>
            {selectedRules.length === 0 ? (
              <Text style={styles.muted}>No rules yet for {pieceNames[selectedPiece]}.</Text>
            ) : (
              selectedRules.map((rule) => (
                <View key={rule.id} style={styles.savedRuleRow}>
                  <Text style={styles.savedRuleTitle}>{animationActionLabel(rule.action)}</Text>
                  <Text style={styles.muted}>{rule.clipStack.map((item) => studioAnimationClips.find((clip) => clip.id === item.clipId)?.name ?? item.clipId).join(" → ")}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
    </Panel>
  );
}"""

content = content[:start_idx] + new_return + content[end_idx:]

with open('apps/player-app/src/App.tsx', 'w') as f:
    f.write(content)

print("Update completed.")
