import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../src/theme/colors';
import { saveIdentity } from '../src/storage/identity';
import { setOnboardingComplete } from '../src/storage/onboarding';
import { HiLinkUser } from '../src/models/user';

type IdentificationMethod =
  | 'admission'
  | 'student_id'
  | 'none';

type StudentType =
  | 'boarding'
  | 'day'
  | 'unknown';

const SCHOOLS = [
  'Kabianga High School',
  'Kabarak High School',
  'Kenya High School',
  'Mang’u High School',
  'Alliance High School',
  'Other',
];

const FORMS = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Grade 10',
];

const STREAMS = [
  'None',
  'A',
  'B',
  'C',
  'D',
  'E',
  'Other',
];

const HOUSES = [
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Other',
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  const [school, setSchool] = useState('');
  const [identificationMethod, setIdentificationMethod] =
    useState<IdentificationMethod | null>(null);
  const [identificationValue, setIdentificationValue] =
    useState('');

  const [form, setForm] = useState('');
  const [stream, setStream] = useState('');
  const [house, setHouse] = useState('');
  const [studentType, setStudentType] =
    useState<StudentType>('unknown');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  function next() {
    if (step === 0 && !school) {
      Alert.alert(
        'Choose your school',
        'Select your school before continuing.',
      );
      return;
    }

    if (step === 1 && !identificationMethod) {
      Alert.alert(
        'Choose an option',
        'Select how your school identifies you.',
      );
      return;
    }

    if (
      step === 1 &&
      identificationMethod !== 'none' &&
      !identificationValue.trim()
    ) {
      Alert.alert(
        'Enter your ID',
        'Enter your admission number or student ID.',
      );
      return;
    }

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    finish();
  }

  function back() {
    if (step === 0) {
      return;
    }

    setStep(step - 1);
  }

  async function finish() {
    const now = new Date().toISOString();

    const user: HiLinkUser = {
      id: `local-${Date.now()}`,
      hilinkId: `HL-${Date.now().toString().slice(-8)}`,

      name: name.trim() || 'Hi-Link Student',
      username:
        username.trim().replace(/^@/, '') ||
        `student${Date.now().toString().slice(-6)}`,

      role: 'student',

      schoolId: `school-${school
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,

      schoolName: school,

      ...(identificationMethod === 'admission' &&
      identificationValue.trim()
        ? {
            admissionNumber:
              identificationValue.trim(),
          }
        : {}),

      ...(identificationMethod === 'student_id' &&
      identificationValue.trim()
        ? {
            studentId:
              identificationValue.trim(),
          }
        : {}),

      form: form || undefined,
      stream: stream || undefined,
      house: house || undefined,

      boardingStatus:
        studentType === 'unknown'
          ? 'unknown'
          : studentType,

      createdAt: now,
      updatedAt: now,
    };

    await saveIdentity(user);
    await setOnboardingComplete(true);

    router.replace('/(tabs)/home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>H</Text>
          </View>

          <Text style={styles.brandText}>HI-LINK</Text>
        </View>

        <Text style={styles.stepText}>
          {step + 1} / 5
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progress,
            {
              width: `${((step + 1) / 5) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <SchoolStep
            school={school}
            setSchool={setSchool}
          />
        )}

        {step === 1 && (
          <IdentificationStep
            method={identificationMethod}
            setMethod={setIdentificationMethod}
            value={identificationValue}
            setValue={setIdentificationValue}
          />
        )}

        {step === 2 && (
          <AcademicStep
            form={form}
            setForm={setForm}
            stream={stream}
            setStream={setStream}
            house={house}
            setHouse={setHouse}
            studentType={studentType}
            setStudentType={setStudentType}
          />
        )}

        {step === 3 && (
          <ProfileStep
            name={name}
            setName={setName}
            username={username}
            setUsername={setUsername}
          />
        )}

        {step === 4 && (
          <ReadyStep
            school={school}
            form={form}
            stream={stream}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable
            style={styles.backButton}
            onPress={back}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.white}
            />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <Pressable
          style={styles.continueButton}
          onPress={next}
        >
          <Text style={styles.continueText}>
            {step === 4 ? 'Enter Hi-Link' : 'Continue'}
          </Text>

          <Ionicons
            name={
              step === 4
                ? 'checkmark'
                : 'arrow-forward'
            }
            size={20}
            color={colors.background}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SchoolStep({
  school,
  setSchool,
}: {
  school: string;
  setSchool: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>WELCOME TO HI-LINK</Text>

      <Text style={styles.title}>
        Find your school.
      </Text>

      <Text style={styles.description}>
        Your school connects you with the right
        community, classmates and resources.
      </Text>

      <TextInput
        value={school}
        onChangeText={setSchool}
        placeholder="Search your school..."
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <View style={styles.options}>
        {SCHOOLS.filter((item) =>
          item.toLowerCase().includes(
            school.toLowerCase(),
          ),
        ).map((item) => (
          <Choice
            key={item}
            label={item}
            selected={school === item}
            onPress={() => setSchool(item)}
            icon="school-outline"
          />
        ))}
      </View>
    </View>
  );
}

function IdentificationStep({
  method,
  setMethod,
  value,
  setValue,
}: {
  method: IdentificationMethod | null;
  setMethod: (
    value: IdentificationMethod,
  ) => void;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>
        SCHOOL IDENTITY
      </Text>

      <Text style={styles.title}>
        How does your school identify you?
      </Text>

      <Text style={styles.description}>
        Not every school uses the same type of
        student identification.
      </Text>

      <Choice
        label="Admission Number"
        description="Use the admission number given by your school."
        icon="card-outline"
        selected={method === 'admission'}
        onPress={() => setMethod('admission')}
      />

      <Choice
        label="Student ID"
        description="Use your school-issued student ID."
        icon="id-card-outline"
        selected={method === 'student_id'}
        onPress={() => setMethod('student_id')}
      />

      <Choice
        label="I don't have one"
        description="Continue without an admission number or student ID."
        icon="person-outline"
        selected={method === 'none'}
        onPress={() => setMethod('none')}
      />

      {method &&
      method !== 'none' ? (
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={
            method === 'admission'
              ? 'Admission number'
              : 'Student ID'
          }
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
        />
      ) : null}

      {method === 'none' ? (
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.exileBlue}
          />

          <Text style={styles.infoText}>
            In the production version, students
            without an ID will use a school-approved
            verification method.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function AcademicStep({
  form,
  setForm,
  stream,
  setStream,
  house,
  setHouse,
  studentType,
  setStudentType,
}: {
  form: string;
  setForm: (value: string) => void;
  stream: string;
  setStream: (value: string) => void;
  house: string;
  setHouse: (value: string) => void;
  studentType: StudentType;
  setStudentType: (value: StudentType) => void;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>
        SCHOOL PROFILE
      </Text>

      <Text style={styles.title}>
        Tell us about your school life.
      </Text>

      <Text style={styles.description}>
        These details help Hi-Link connect you
        with the right classmates and communities.
      </Text>

      <Text style={styles.fieldLabel}>
        Form / Grade
      </Text>

      <View style={styles.choiceGrid}>
        {FORMS.map((item) => (
          <SmallChoice
            key={item}
            label={item}
            selected={form === item}
            onPress={() => setForm(item)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>
        Stream / Class
      </Text>

      <View style={styles.choiceGrid}>
        {STREAMS.map((item) => (
          <SmallChoice
            key={item}
            label={item}
            selected={stream === item}
            onPress={() => setStream(item)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>
        House
      </Text>

      <View style={styles.choiceGrid}>
        {HOUSES.map((item) => (
          <SmallChoice
            key={item}
            label={item}
            selected={house === item}
            onPress={() => setHouse(item)}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>
        Student type
      </Text>

      <View style={styles.typeRow}>
        <SmallChoice
          label="Boarding"
          selected={studentType === 'boarding'}
          onPress={() =>
            setStudentType('boarding')
          }
        />

        <SmallChoice
          label="Day"
          selected={studentType === 'day'}
          onPress={() =>
            setStudentType('day')
          }
        />
      </View>
    </View>
  );
}

function ProfileStep({
  name,
  setName,
  username,
  setUsername,
}: {
  name: string;
  setName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>
        YOUR PROFILE
      </Text>

      <Text style={styles.title}>
        Make Hi-Link yours.
      </Text>

      <Text style={styles.description}>
        Your name and username are part of your
        social profile. You can change them later.
      </Text>

      <Text style={styles.fieldLabel}>
        Name
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />

      <Text style={styles.fieldLabel}>
        Username
      </Text>

      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="@username"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize="none"
      />

      <View style={styles.profileNote}>
        <Ionicons
          name="sparkles-outline"
          size={20}
          color={colors.exileGreen}
        />

        <Text style={styles.infoText}>
          You can add your profile picture, cover
          image and bio from your profile after
          entering Hi-Link.
        </Text>
      </View>
    </View>
  );
}

function ReadyStep({
  school,
  form,
  stream,
}: {
  school: string;
  form: string;
  stream: string;
}) {
  return (
    <View>
      <View style={styles.readyIcon}>
        <Ionicons
          name="checkmark"
          size={38}
          color={colors.background}
        />
      </View>

      <Text style={styles.title}>
        You're ready.
      </Text>

      <Text style={styles.description}>
        Your Hi-Link school profile is set up.
      </Text>

      <View style={styles.summary}>
        <SummaryRow
          label="School"
          value={school}
        />

        {form ? (
          <SummaryRow
            label="Form / Grade"
            value={form}
          />
        ) : null}

        {stream ? (
          <SummaryRow
            label="Stream / Class"
            value={stream}
          />
        ) : null}
      </View>
    </View>
  );
}

function Choice({
  label,
  description,
  selected,
  onPress,
  icon,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        selected && styles.choiceSelected,
      ]}
    >
      <View
        style={[
          styles.choiceIcon,
          selected &&
            styles.choiceIconSelected,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            selected
              ? colors.background
              : colors.exileGreen
          }
        />
      </View>

      <View style={styles.choiceText}>
        <Text style={styles.choiceLabel}>
          {label}
        </Text>

        {description ? (
          <Text style={styles.choiceDescription}>
            {description}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={colors.exileGreen}
        />
      ) : null}
    </Pressable>
  );
}

function SmallChoice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.smallChoice,
        selected && styles.smallChoiceSelected,
      ]}
    >
      <Text
        style={[
          styles.smallChoiceText,
          selected &&
            styles.smallChoiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    height: 68,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: colors.background,
    fontSize: 19,
    fontWeight: '900',
  },

  brandText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  stepText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
  },

  progress: {
    height: 3,
    backgroundColor: colors.exileGreen,
  },

  content: {
    padding: 24,
    paddingBottom: 130,
  },

  eyebrow: {
    color: colors.exileGreen,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  title: {
    color: colors.white,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
  },

  description: {
    color: colors.whiteMuted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 24,
  },

  input: {
    height: 54,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 16,
    color: colors.white,
    fontSize: 15,
    marginBottom: 12,
  },

  options: {
    gap: 9,
  },

  choice: {
    minHeight: 72,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 9,
  },

  choiceSelected: {
    borderColor: colors.exileGreen,
    backgroundColor: 'rgba(25,230,140,0.08)',
  },

  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.charcoal2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  choiceIconSelected: {
    backgroundColor: colors.exileGreen,
  },

  choiceText: {
    flex: 1,
  },

  choiceLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  choiceDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  fieldLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 7,
  },

  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 13,
  },

  smallChoice: {
    minWidth: 72,
    height: 43,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallChoiceSelected: {
    backgroundColor: colors.exileGreen,
    borderColor: colors.exileGreen,
  },

  smallChoiceText: {
    color: colors.whiteMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  smallChoiceTextSelected: {
    color: colors.background,
  },

  typeRow: {
    flexDirection: 'row',
    gap: 9,
  },

  infoBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(47,128,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(47,128,255,0.22)',
    borderRadius: 15,
    marginTop: 8,
  },

  profileNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 15,
    backgroundColor: 'rgba(25,230,140,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(25,230,140,0.18)',
    borderRadius: 15,
    marginTop: 10,
  },

  infoText: {
    flex: 1,
    color: colors.whiteMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  readyIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  summary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 8,
  },

  summaryRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },

  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
  },

  summaryValue: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 22,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },

  backButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backPlaceholder: {
    width: 0,
  },

  continueButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.exileGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  continueText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
});
