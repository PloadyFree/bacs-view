import AddIcon from 'material-ui-icons/Add';
import Remove from 'material-ui-icons/Remove';
import SaveIcon from 'material-ui-icons/Save';
import Button from 'material-ui/Button';
import Checkbox from 'material-ui/Checkbox';
import { FormControlLabel } from 'material-ui/Form';
import IconButton from 'material-ui/IconButton';
import Paper from 'material-ui/Paper/Paper';
import { StyleRules } from 'material-ui/styles';
import withStyles from 'material-ui/styles/withStyles';
import TextField from 'material-ui/TextField';
import Typography from 'material-ui/Typography/Typography';
import * as React from 'react';
import ContestInfoEditer from './contestInfoEditor';
import contestApi from '../api/contestApi';
import problemsApi from '../api/problemsApi';
import { hashHistory } from '../app/history';
import authService from '../auth/authService';
import ProblemTable from '../problem/problemTable';
import {
  ArchiveProblem,
  ContestInfo,
  ContestProblem,
  ProblemInfo
  } from '../typings';

interface IContestBuilderProps {
  classes?: any;
  match: any;
}

interface IContestBuilderState {
  allProblems: Map<string, ArchiveProblem>;
  includeExternal: boolean;
  contestInfo: ContestInfo;
  error: boolean;
}

class ContestBuilder extends React.Component<IContestBuilderProps, IContestBuilderState> {
  indexes = new Map<string, string>();
  catch = (e) => console.log(e) || this.setState({ error: true })
  constructor(props) {
    super(props);
    const start = new Date();
    const finish = new Date();
    finish.setHours(start.getHours() + 5);

    this.state = {
      contestInfo: {
        startTime: start.toISOString(),
        finishTime: finish.toISOString(),
        name: '',
        problems: [],
        id: null,
      },
      allProblems: new Map(),
      includeExternal: false,
      error: false,
    };
    this.handleProblemIndexChange = this.handleProblemIndexChange.bind(this);
  }

  fetchContestInfo = async (contestId) => {
    if (!contestId)
      return;
    const contestInfo = await contestApi.GetContestInfo(contestId);
    this.setState({
      contestInfo
    });
    const problems = contestInfo && contestInfo.problems;
    if (!problems)
      return;
    await this.patchProblems(problems);
  }

  private patchProblem = (problem) => {
    if (problem.problemId)
      return Promise.resolve(problem);
    return problemsApi.GetArchiveProblem(problem.contestId, problem.index);
  }

  private async patchProblems(problems: ContestProblem[]) {
    const archiveProblems = await Promise.all(problems.map(this.patchProblem));
    const updatedByArchiveIdsProblems = problems.map((p, index) => ({
      ...p,
      ...(archiveProblems[index][0])
    }));
    this.setState(prevState => ({
      contestInfo: {
        ...prevState.contestInfo,
        problems: updatedByArchiveIdsProblems,
      }
    }));
  }

  fetchAllProblems = () => {
    problemsApi.GetProblems(this.state.includeExternal)
      .then(allProblems => {
        const hashes = allProblems.map(p => hashByProblem(p));
        this.setState({
          allProblems: new Map(
            allProblems.map<[string, ArchiveProblem]>((p, index) => [hashes[index], p])
          )
        });
      })
  }

  componentWillReceiveProps(nextProps) {
    this.fetchContestInfo(
      nextProps.match.params.contestId
    );
  }

  componentDidMount() {
    this.fetchContestInfo(
      this.props.match.params.contestId
    );
  }

  handleCheckboxChange = (event) => {
    this.setState({
      [event.target.name]: event.target.checked
    });
  }

  render() {
    if (!authService.IsAdmin()) {
      return null;
    }
    const { classes } = this.props;
    const { contestInfo, allProblems, includeExternal } = this.state;
    const contestProblemsNamesSet = new Set(contestInfo.problems.map(p => hashByProblem(p)));
    const otherProblems = Array.from(allProblems.values()).filter(p => !contestProblemsNamesSet.has(hashByProblem(p)));
    return (
      <Paper className={classes.container}>
        <div>
          <ContestInfoEditer
            onChangeContestInfo={this.handleInfoChanged}
            contestInfo={contestInfo}
          />
          <Button onClick={() => this.updateContest(this.state.contestInfo)}>
            <SaveIcon />
            Сохранить общую информацию
          </Button>
        </div>
        <div>
          <Typography >
            Задачи в контесте
          </Typography>
          <ProblemTable
            problems={contestInfo.problems}
            enhance={this.contestProblemsEnhance}
          />
        </div>
        <div>
          <div className={classes.tableControl}>
            <Typography variant='subheading'>
              Все задачи
          </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeExternal}
                  onChange={this.handleCheckboxChange}
                  name='includeExternal'
                />
              }
              label='External'
            />
            <Button onClick={this.fetchAllProblems}>
              Загрузить все задачи (будет больно)
          </Button>
          </div>
          <ProblemTable
            problems={otherProblems}
            enhance={this.allProblemsEnhance}
            withPaging
          />
        </div>
      </Paper >
    );
  }

  handleInfoChanged = (contestInfo: ContestInfo) => {
    this.setState({
      contestInfo
    })
  }

  handleAddProblem = (problem: ArchiveProblem) => () => {
    const patchedProblem = {
      ...problem,
      index: this.indexes.get(hashByProblem(problem)),
    }
    const newProblems = [...this.state.contestInfo.problems, patchedProblem];
    const newInfo = {
      ...this.state.contestInfo,
      problems: newProblems,
    };

    this.updateContest(newInfo)
      .then(() => this.setState(prevState => {
        prevState.allProblems.delete(hashByProblem(problem));
        return {
          contestInfo: newInfo,
        };
      }))
      .catch(this.catch);
  }

  handleRemoveProblem = (problem: ContestProblem) => () => {
    const newProblems = this.state.contestInfo.problems.filter(p => p.index !== problem.index);
    const newInfo = {
      ...this.state.contestInfo,
      problems: newProblems,
    };
    this.updateContest(newInfo)
      .then(async () => {
        const patched = await this.patchProblem(problem);
        this.setState(prevState => {
          prevState.allProblems.set(hashByProblem(patched), patched);
          return {
            contestInfo: newInfo
          };
        })
      })
  }

  handleProblemIndexChange(event) {
    this.indexes.set(event.target.name, event.target.value);
    this.setState({});
  }

  updateContest = (contestInfo: ContestInfo) => {
    if (this.props.match.params.contestId)
      return contestApi.EditContest(contestInfo);

    return contestApi.CreateContest(contestInfo)
      .then((id) => hashHistory.push('/admin/contest/' + id));
  }

  allProblemsEnhance = [
    {
      title: '',
      width: 50,
      renderCell: (problem: ArchiveProblem) => (
        <IconButton disabled={!this.indexes.get(hashByProblem(problem))} onClick={this.handleAddProblem(problem)} >
          <AddIcon />
        </IconButton>
      )
    },
    {
      title: 'Индекс задачи',
      width: 150,
      key: (problem) => hashByProblem(problem),
      renderCell: (problem: ArchiveProblem) => {
        const index = this.indexes.get(hashByProblem(problem));
        return <TextField
          error={index === ''}
          name={hashByProblem(problem)}
          value={index}
          onChange={this.handleProblemIndexChange}
        />
      }
    },
  ];

  contestProblemsEnhance = [{
    title: '',
    width: 50,
    renderCell: (problem: ContestProblem) => (
      <IconButton onClick={this.handleRemoveProblem(problem)} >
        <Remove />
      </IconButton>
    )
  }]
}

const styles: StyleRules = {
  container: {
    paddingLeft: 20,
    paddingTop: 10,
    paddingBottom: 20,
    '& > div': {
      marginBottom: 30,
    }
  },
  tableControl: {
    marginBottom: 5,
  }
};

const hashByProblem = (p: ProblemInfo) => {
  const problemId = (p as ArchiveProblem).problemId;
  if (problemId)
    return problemId.resourceName + problemId.resourceProblemId;
  return p.name;
}

export default withStyles(styles)<IContestBuilderProps>(ContestBuilder as any);