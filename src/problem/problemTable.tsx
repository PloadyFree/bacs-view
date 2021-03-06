import Table, { TableFooter, TablePagination } from 'material-ui/Table';
import TableBody from 'material-ui/Table/TableBody';
import TableCell from 'material-ui/Table/TableCell';
import TableHead from 'material-ui/Table/TableHead';
import TableRow from 'material-ui/Table/TableRow';
import * as React from 'react';
import { ContestProblem, Enhance, ProblemInfo } from '../typings';

interface IProblemTableProps {
  problems: ProblemInfo[];
  enhance?: Enhance<ProblemInfo>[];
  withPaging?: boolean;
}

interface IProblemTableState {
  currentPage: number;
  rowsPerPage: number;
}

const toMB = (byte) => byte / (1024 * 1024) | 0;
export const formatProblemName = (problem: ContestProblem) => (problem.index ? problem.index + '. ' : '') + problem.name;

const inlineStyleByEnhance = (enhance: Enhance<any>) => (
  enhance.width && {
    width: enhance.width,
    padding: 0
  }
);

const defaultRowsPerPage = 10;

class ProblemTable extends React.Component<IProblemTableProps, IProblemTableState> {
  state = {
    currentPage: 0,
    rowsPerPage: defaultRowsPerPage,
  }

  handlePageChanged = (_, currentPage) => this.setState({ currentPage });
  handleChangeRowsPerPage = (event) => this.setState({ rowsPerPage: event.target.value });

  render() {
    const { currentPage, rowsPerPage } = this.state;
    const { enhance, problems, withPaging } = this.props;
    const selectedProblems = withPaging
      ? problems.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage)
      : problems;
      
    return (
      <Table>
        <TableHead>
          <TableRow>
            {
              enhance &&
              enhance.map(en => (
                <TableCell
                  key={en.title}
                  style={inlineStyleByEnhance(en)}>
                  {en.title}
                </TableCell>
              ))
            }
            <TableCell> Название </TableCell>
            <TableCell> Условие </TableCell>
            <TableCell> Ограничения </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            selectedProblems &&
            selectedProblems
              .map((problem, index) => (
                <TableRow key={index}>
                  {
                    enhance &&
                    enhance.map((en, cellIndex) =>
                      <TableCell
                        key={en.key ? en.key(problem) : cellIndex}
                        style={inlineStyleByEnhance(en)}>
                        {en.renderCell(problem)}
                      </TableCell>
                    )
                  }
                  <TableCell>{formatProblemName(problem as ContestProblem)}</TableCell>
                  <TableCell>
                    <a href={problem.statementUrl} onClick={(e) => e.stopPropagation()} target='_blank'>
                      {problem.statementUrl ? 'Условие задачи' : ''}
                    </a>
                  </TableCell>
                  <TableCell>
                    {toMB(problem.memoryLimitBytes)} MB
                    <br />
                    {Math.floor(problem.timeLimitMillis / 1000)} сек.
                  </TableCell>
                </TableRow>
              ))
          }
        </TableBody>
        <TableFooter>
          {
            withPaging &&
            selectedProblems &&
            problems && problems.length > defaultRowsPerPage &&
            <TableRow>
              <TablePagination
                rowsPerPage={rowsPerPage}
                page={currentPage}
                onChangePage={this.handlePageChanged}
                onChangeRowsPerPage={this.handleChangeRowsPerPage}
                count={problems.length}
                rowsPerPageOptions={[defaultRowsPerPage, 15, 25, 50]}
              />
            </TableRow>}
        </TableFooter>
      </Table>
    );
  }
}

export default ProblemTable;