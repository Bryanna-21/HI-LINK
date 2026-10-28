import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { createPoll, deletePoll, getPolls, votePoll } from '../../storage/communities';
import { useLoad } from '../../hooks/useLoad';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, EmptyState, ErrorState, Field, LoadingState } from '../ui';
import type { TabProps } from './types';

export function PollsTab({ community, userId, isMember, isAdmin }: TabProps) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useLoad(() => getPolls(community.id), [community.id]);
  const [composing, setComposing] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);

    try {
      await createPoll(userId, { communityId: community.id, question, options });
      setQuestion('');
      setOptions(['', '']);
      setComposing(false);
      await reload();
    } catch (caught) {
      Alert.alert('Could not create poll', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function vote(pollId: string, optionId: string) {
    try {
      await votePoll(userId, pollId, optionId);
      await reload();
    } catch (caught) {
      Alert.alert('Could not vote', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  return (
    <View>
      {isAdmin ? (
        composing ? (
          <Card>
            <Field label="Question" value={question} onChangeText={setQuestion} />
            {options.map((value, index) => (
              <Field
                key={index}
                label={`Option ${index + 1}`}
                value={value}
                onChangeText={(text) => setOptions((current) => current.map((item, i) => (i === index ? text : item)))}
              />
            ))}
            {options.length < 6 ? (
              <View style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
                <Button label="Add option" variant="secondary" onPress={() => setOptions((current) => [...current, ''])} />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
              <Button label="Create poll" onPress={create} loading={busy} />
            </View>
          </Card>
        ) : (
          <View style={{ marginBottom: 12 }}>
            <Button label="New poll" icon="stats-chart-outline" onPress={() => setComposing(true)} />
          </View>
        )
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="No polls yet" body="Admins can ask the community a question." />
      ) : (
        (data ?? []).map((poll) => {
          const total = Object.keys(poll.votes).length;
          const mine = poll.votes[userId];
          const closed = Boolean(poll.closesAt) && new Date(poll.closesAt as string).getTime() < Date.now();

          return (
            <Card key={poll.id}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginBottom: 10 }}>{poll.question}</Text>

              {poll.options.map((option) => {
                const count = Object.values(poll.votes).filter((id) => id === option.id).length;
                const percent = total === 0 ? 0 : Math.round((count / total) * 100);

                return (
                  <Pressable
                    key={option.id}
                    disabled={!isMember || closed}
                    onPress={() => vote(poll.id, option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.text}, ${percent} percent`}
                    style={{
                      borderWidth: 1,
                      borderColor: mine === option.id ? colors.accent : colors.border,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${percent}%`,
                        backgroundColor: colors.accentSoft,
                      }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{option.text}</Text>
                      <Text style={{ color: colors.muted }}>{percent}%</Text>
                    </View>
                  </Pressable>
                );
              })}

              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {total} {total === 1 ? 'vote' : 'votes'}
                {closed ? ' · closed' : !isMember ? ' · join to vote' : ''}
              </Text>

              {isAdmin ? (
                <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                  <Button
                    label="Delete poll"
                    variant="danger"
                    onPress={async () => {
                      await deletePoll(userId, poll.id);
                      await reload();
                    }}
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </View>
  );
}
