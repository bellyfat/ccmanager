import React, {useState, useMemo} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import {shortcutManager} from '../services/shortcutManager.js';
import {configurationManager} from '../services/configurationManager.js';
import {generateWorktreeDirectory} from '../utils/worktreeUtils.js';
import {WorktreeService} from '../services/worktreeService.js';

interface NewWorktreeProps {
	onComplete: (
		path: string,
		branch: string,
		baseBranch: string,
		copySettings: boolean,
	) => void;
	onCancel: () => void;
}

type Step = 'path' | 'branch' | 'base-branch' | 'copy-settings';

interface BranchItem {
	label: string;
	value: string;
}

const NewWorktree: React.FC<NewWorktreeProps> = ({onComplete, onCancel}) => {
	const worktreeConfig = configurationManager.getWorktreeConfig();
	const isAutoDirectory = worktreeConfig.autoDirectory;

	// Adjust initial step based on auto directory mode
	const [step, setStep] = useState<Step>(isAutoDirectory ? 'branch' : 'path');
	const [path, setPath] = useState('');
	const [branch, setBranch] = useState('');
	const [baseBranch, setBaseBranch] = useState('');

	// Initialize worktree service and load branches (memoized to avoid re-initialization)
	const {branches, defaultBranch} = useMemo(() => {
		const service = new WorktreeService();
		const allBranches = service.getAllBranches();
		const defaultBr = service.getDefaultBranch();
		return {
			branches: allBranches,
			defaultBranch: defaultBr,
		};
	}, []); // Empty deps array - only initialize once

	// Create branch items with default branch first (memoized)
	const branchItems: BranchItem[] = useMemo(
		() => [
			{label: `${defaultBranch} (default)`, value: defaultBranch},
			...branches
				.filter(br => br !== defaultBranch)
				.map(br => ({label: br, value: br})),
		],
		[branches, defaultBranch],
	);

	useInput((input, key) => {
		if (shortcutManager.matchesShortcut('cancel', input, key)) {
			onCancel();
		}
	});

	const handlePathSubmit = (value: string) => {
		if (value.trim()) {
			setPath(value.trim());
			setStep('branch');
		}
	};

	const handleBranchSubmit = (value: string) => {
		if (value.trim()) {
			setBranch(value.trim());
			setStep('base-branch');
		}
	};

	const handleBaseBranchSelect = (item: {label: string; value: string}) => {
		setBaseBranch(item.value);
		setStep('copy-settings');
	};

	const handleCopySettingsSelect = (item: {label: string; value: boolean}) => {
		if (isAutoDirectory) {
			// Generate path from branch name
			const autoPath = generateWorktreeDirectory(
				branch,
				worktreeConfig.autoDirectoryPattern,
			);
			onComplete(autoPath, branch, baseBranch, item.value);
		} else {
			onComplete(path, branch, baseBranch, item.value);
		}
	};

	// Calculate generated path for preview (memoized to avoid expensive recalculations)
	const generatedPath = useMemo(() => {
		return isAutoDirectory && branch
			? generateWorktreeDirectory(branch, worktreeConfig.autoDirectoryPattern)
			: '';
	}, [isAutoDirectory, branch, worktreeConfig.autoDirectoryPattern]);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color="green">
					Create New Worktree
				</Text>
			</Box>

			{step === 'path' && !isAutoDirectory ? (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text>Enter worktree path (relative to repository root):</Text>
					</Box>
					<Box>
						<Text color="cyan">{'> '}</Text>
						<TextInput
							value={path}
							onChange={setPath}
							onSubmit={handlePathSubmit}
							placeholder="e.g., ../myproject-feature"
						/>
					</Box>
				</Box>
			) : step === 'branch' && !isAutoDirectory ? (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text>
							Enter branch name for worktree at <Text color="cyan">{path}</Text>
							:
						</Text>
					</Box>
					<Box>
						<Text color="cyan">{'> '}</Text>
						<TextInput
							value={branch}
							onChange={setBranch}
							onSubmit={handleBranchSubmit}
							placeholder="e.g., feature/new-feature"
						/>
					</Box>
				</Box>
			) : step === 'branch' ? (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text>Enter branch name (directory will be auto-generated):</Text>
					</Box>
					<Box>
						<Text color="cyan">{'> '}</Text>
						<TextInput
							value={branch}
							onChange={setBranch}
							onSubmit={handleBranchSubmit}
							placeholder="e.g., feature/new-feature"
						/>
					</Box>
					{generatedPath && (
						<Box marginTop={1}>
							<Text dimColor>
								Worktree will be created at:{' '}
								<Text color="green">{generatedPath}</Text>
							</Text>
						</Box>
					)}
				</Box>
			) : null}

			{step === 'base-branch' && (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text>
							Select base branch for <Text color="cyan">{branch}</Text>:
						</Text>
					</Box>
					<SelectInput
						items={branchItems}
						onSelect={handleBaseBranchSelect}
						initialIndex={0}
						limit={10}
					/>
				</Box>
			)}

			{step === 'copy-settings' && (
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text>
							Copy .claude/settings.local.json from base branch (
							<Text color="cyan">{baseBranch}</Text>)?
						</Text>
					</Box>
					<SelectInput
						items={[
							{label: 'Yes - Copy settings from base branch', value: true},
							{label: 'No - Start with fresh settings', value: false},
						]}
						onSelect={handleCopySettingsSelect}
						initialIndex={0}
					/>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					Press {shortcutManager.getShortcutDisplay('cancel')} to cancel
				</Text>
			</Box>
		</Box>
	);
};

export default NewWorktree;
